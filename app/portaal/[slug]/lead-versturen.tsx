"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Phone, Mail } from "lucide-react";
import type { LeadFormState } from "@/app/lib/actions/leads";
import { formatCurrency } from "@/app/lib/format";
import {
  leegWachtrij,
  maakAanvraagTekst,
  maakMailtoLink,
  maakSleutel,
  verstuurMetHerhaling,
  verwijderUitWachtrij,
  voegToeAanWachtrij,
  type LeadPayload,
} from "@/app/lib/lead-client";

export type UitgesteldInfo = { tekst: string; mailto: string | null; tel: string | null };
export type LeadFormStaat = LeadFormState & { uitgesteld?: UitgesteldInfo };

type Contact = { telefoonnummer: string | null; email: string | null };

const RESERVE_URL = process.env.NEXT_PUBLIC_LEAD_RESERVE_URL || null;
const EMAIL_PATROON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vervangt useActionState(createLeadAction): zelfde vorm (staat, formulier-
// actie, bezig), maar verstuurt met time-out en herhaling, bewaart de
// aanvraag in de browser als het niet lukt, en stuurt hem bij een volgend
// bezoek (of zodra er weer verbinding is) alsnog, precies één keer dankzij de
// sleutel die per aanvraag wordt meegestuurd.
export function useLeadVersturen(opties: {
  toolId: string;
  bedrijfsnaam: string;
  contact: Contact;
  // Testmodus in de editor: niets versturen en niets bewaren.
  uitgeschakeld?: boolean;
}): [LeadFormStaat | null, (formData: FormData) => void, boolean] {
  const { toolId, bedrijfsnaam, contact, uitgeschakeld } = opties;
  const sleutelRef = useRef<string | null>(null);
  const [extern, setExtern] = useState<LeadFormStaat | null>(null);

  const [staat, formAction, pending] = useActionState<LeadFormStaat | null, FormData>(async (_vorige, formData) => {
    const naam = String(formData.get("naam") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const telefoonnummer = String(formData.get("telefoonnummer") ?? "").trim();
    const fieldErrors: Record<string, string> = {};
    if (!naam) fieldErrors.naam = "Vul je naam in";
    if (!EMAIL_PATROON.test(email)) fieldErrors.email = "Vul een geldig e-mailadres in";
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

    let snapshot: unknown;
    try {
      snapshot = JSON.parse(String(formData.get("snapshot") ?? ""));
    } catch {
      return { error: "Ongeldige aanvraag. Ververs de pagina en probeer het opnieuw." };
    }

    const sleutel = (sleutelRef.current ??= maakSleutel());
    const payload: LeadPayload = { sleutel, toolId, naam, email, telefoonnummer, snapshot };
    setExtern(null);
    const uitslag = await verstuurMetHerhaling(payload, { reserveUrl: RESERVE_URL });

    if (uitslag.soort === "ok") {
      sleutelRef.current = null;
      verwijderUitWachtrij(sleutel);
      return { success: true };
    }
    if (uitslag.soort === "definitief") {
      sleutelRef.current = null;
      verwijderUitWachtrij(sleutel);
      return uitslag.fieldErrors ? { fieldErrors: uitslag.fieldErrors } : { error: uitslag.error ?? "Versturen is niet gelukt." };
    }

    voegToeAanWachtrij(payload);
    const tekst = maakAanvraagTekst(payload, bedrijfsnaam, formatCurrency);
    return {
      uitgesteld: {
        tekst,
        mailto: contact.email ? maakMailtoLink(contact.email, `Aanvraag via ${bedrijfsnaam}`, tekst) : null,
        tel: contact.telefoonnummer ? contact.telefoonnummer.replace(/[^0-9+]/g, "") : null,
      },
    };
  }, null);

  const wachtOpVersturen = Boolean(staat?.uitgesteld) && !extern;

  // Bij elk bezoek, zodra de verbinding terug is, en zolang er iets wacht
  // elke 45 seconden: de wachtrij proberen te legen.
  useEffect(() => {
    if (uitgeschakeld) return;
    let weg = false;
    async function probeer() {
      try {
        const verstuurd = await leegWachtrij({ toolId, reserveUrl: RESERVE_URL });
        if (!weg && sleutelRef.current && verstuurd.includes(sleutelRef.current)) {
          sleutelRef.current = null;
          setExtern({ success: true });
        }
      } catch {
        // volgende keer weer
      }
    }
    void probeer();
    const bijOnline = () => void probeer();
    window.addEventListener("online", bijOnline);
    const timer = wachtOpVersturen ? setInterval(() => void probeer(), 45_000) : null;
    return () => {
      weg = true;
      window.removeEventListener("online", bijOnline);
      if (timer) clearInterval(timer);
    };
  }, [toolId, uitgeschakeld, wachtOpVersturen]);

  return [extern ?? staat, formAction, pending];
}

// Eerlijke melding als een aanvraag (nog) niet is aangekomen, met twee
// manieren om je gewoon te bereiken en de samenvatting als tekst.
export function UitgesteldMelding({ info, bedrijfsnaam }: { info: UitgesteldInfo; bedrijfsnaam: string }) {
  const knop =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-foreground no-underline hover:bg-[var(--brand-primary)]/10 focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-warning bg-warning/10 p-3 text-sm text-foreground">
      <p className="font-semibold">Je aanvraag is nog niet verstuurd. We proberen het automatisch opnieuw.</p>
      <p className="text-muted-foreground">Wil je niet wachten? Stuur je aanvraag zelf aan {bedrijfsnaam}.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {info.mailto && (
          <a href={info.mailto} className={knop}>
            <Mail className="h-4 w-4" aria-hidden="true" /> Mail je aanvraag
          </a>
        )}
        {info.tel && (
          <a href={`tel:${info.tel}`} className={knop}>
            <Phone className="h-4 w-4" aria-hidden="true" /> Bel ons
          </a>
        )}
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Je aanvraag als tekst (kopieer en mail die)
        <textarea
          readOnly
          rows={6}
          value={info.tekst}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-border bg-background p-2 text-base text-foreground"
        />
      </label>
    </div>
  );
}
