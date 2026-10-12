"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Loader2, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { herzendOfferteMailAction, offerteMailVoorbeeldAction, verstuurOfferteAction, type VerstuurResultaat } from "@/app/lib/actions/offerte-v2";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { controleerOfferte, type ControlePunt } from "@/app/lib/offerte/controle";
import type { OfferteInhoud } from "@/app/lib/offerte/model";
import { formatCents } from "@/app/lib/offerte/weergave";

type Mailvoorbeeld = { onderwerp: string; tekst: string; html: string; naar: string };

// "Controleren en versturen": een checklist (blokkerend of waarschuwing), daarna een
// bevestiging in de pagina met het voorbeeld van de e-mail, en na het versturen de
// opties om de link te kopiëren of via WhatsApp te delen.
export function ControleDialoog(props: Props) {
  // Alleen gemonteerd zolang hij open is: elke keer opnieuw bij de checklist.
  return props.open ? <ControleInhoud {...props} /> : null;
}

type Props = {
  open: boolean;
  onSluit: () => void;
  offerteId: string;
  inhoud: OfferteInhoud;
  onGaNaar: (actie: NonNullable<ControlePunt["actie"]>) => void;
  onVerstuurd: () => void;
};

function ControleInhoud({
  open,
  onSluit,
  offerteId,
  inhoud,
  onGaNaar,
  onVerstuurd,
}: {
  open: boolean;
  onSluit: () => void;
  offerteId: string;
  inhoud: OfferteInhoud;
  onGaNaar: (actie: NonNullable<ControlePunt["actie"]>) => void;
  onVerstuurd: () => void;
}) {
  const [stap, setStap] = useState<"controle" | "bevestig" | "klaar">("controle");
  const [voorbeeld, setVoorbeeld] = useState<Mailvoorbeeld | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<Extract<VerstuurResultaat, { ok: true }> | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const c = controleerOfferte(inhoud);
  const t = berekenTotalen(inhoud);
  const totaal = t.toonIncl || t.kor ? t.totaalIncl : t.totaalExcl;

  async function naarBevestiging() {
    setBezig(true);
    const r = await offerteMailVoorbeeldAction(offerteId, inhoud);
    setBezig(false);
    if (r.ok) setVoorbeeld(r);
    setStap("bevestig");
  }

  async function verstuur(kanaal: "email" | "link") {
    setBezig(true);
    setFout(null);
    const r = await verstuurOfferteAction(offerteId, kanaal);
    setBezig(false);
    if (!r.ok) return setFout(r.error);
    setResultaat(r);
    setStap("klaar");
    onVerstuurd();
  }

  const punt = (p: ControlePunt, soort: "blok" | "waarschuw") => (
    <li key={p.id} className="flex items-start gap-2 text-sm">
      {soort === "blok" ? <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
      <span className="min-w-0 flex-1 text-foreground">
        {p.bericht}
        {p.actie && (
          <>
            {" "}
            {p.actie === "profiel" ? (
              <Link href="/dashboard/profiel#offertegegevens" className="font-semibold underline">
                Aanpassen in Profiel
              </Link>
            ) : (
              <button type="button" className="font-semibold underline" onClick={() => { onGaNaar(p.actie!); onSluit(); }}>
                Aanpassen
              </button>
            )}
          </>
        )}
      </span>
    </li>
  );

  return (
    <Overlay open={open} onClose={onSluit} ariaLabelledBy="ctl-titel" className="flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:rounded-2xl">
        <button type="button" aria-label="Sluiten" onClick={onSluit} className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {stap === "controle" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              Controleren en versturen
            </h2>
            {c.blokkerend.length > 0 && (
              <section aria-label="Dit moet nog kloppen" className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <h3 className="text-sm font-bold text-foreground">Dit moet eerst kloppen</h3>
                <ul className="flex flex-col gap-2">{c.blokkerend.map((p) => punt(p, "blok"))}</ul>
              </section>
            )}
            {c.waarschuwingen.length > 0 && (
              <section aria-label="Let op" className="flex flex-col gap-2 rounded-lg border border-example bg-example/10 p-3">
                <h3 className="text-sm font-bold text-foreground">Let op</h3>
                <ul className="flex flex-col gap-2">{c.waarschuwingen.map((p) => punt(p, "waarschuw"))}</ul>
              </section>
            )}
            <ul className="flex flex-col gap-1.5">
              {c.ok.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {p.bericht}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={onSluit}>
                Terug naar de offerte
              </Button>
              <Button type="button" disabled={c.blokkerend.length > 0 || bezig} onClick={naarBevestiging}>
                {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Verder naar versturen
              </Button>
            </div>
          </>
        )}

        {stap === "bevestig" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              Offerte {inhoud.nummer} van {formatCents(totaal)} versturen naar {inhoud.klant.email}?
            </h2>
            <p className="text-sm text-muted-foreground">Na het versturen kun je deze versie niet meer wijzigen. Wijzigen kan daarna als nieuwe versie.</p>
            {voorbeeld && (
              <details className="rounded-lg border border-border" open>
                <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-foreground">Zo ziet de e-mail eruit</summary>
                <div className="border-t border-border px-3 py-2 text-sm">
                  <p className="text-muted-foreground">
                    Aan: {voorbeeld.naar} · Onderwerp: <strong className="text-foreground">{voorbeeld.onderwerp}</strong>
                  </p>
                  <p className="mt-1 text-muted-foreground">Bijlagen: {`Offerte ${inhoud.nummer}.pdf`}{inhoud.bijlagen[0] ? ` en ${inhoud.bijlagen[0].naam}` : ""}</p>
                </div>
                <iframe title="Voorbeeld van de e-mail" srcDoc={voorbeeld.html} sandbox="" className="h-80 w-full border-t border-border bg-white" />
              </details>
            )}
            {fout && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {fout}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={() => setStap("controle")} disabled={bezig}>
                Terug
              </Button>
              <Button type="button" variant="outline" onClick={() => verstuur("link")} disabled={bezig}>
                Alleen link maken
              </Button>
              <Button type="button" onClick={() => verstuur("email")} disabled={bezig}>
                {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Versturen naar {inhoud.klant.email}
              </Button>
            </div>
          </>
        )}

        {stap === "klaar" && resultaat && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              {resultaat.mail === "verzonden" ? "Offerte verstuurd" : resultaat.mail === "mislukt" ? "Offerte staat klaar, maar de e-mail is niet verstuurd" : "Offerte staat klaar om te delen"}
            </h2>
            {resultaat.mail === "verzonden" && <p className="text-sm text-foreground">De klant heeft een e-mail gekregen met de offerte als PDF, de algemene voorwaarden en een link om online akkoord te geven.</p>}
            {resultaat.mail === "mislukt" && (
              <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-foreground">
                De e-mail kon niet worden verstuurd ({resultaat.mailFout}). Je kunt het opnieuw proberen of de link zelf delen.
                <div className="mt-2">
                  <Button type="button" size="sm" variant="outline" disabled={bezig} onClick={async () => { setBezig(true); const r = await herzendOfferteMailAction(offerteId); setBezig(false); if (r.ok) setResultaat({ ...resultaat, mail: "verzonden" }); else setFout(r.error); }}>
                    E-mail opnieuw proberen
                  </Button>
                </div>
              </div>
            )}
            {fout && <p role="alert" className="text-sm font-medium text-destructive">{fout}</p>}
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
              <p className="text-sm font-semibold text-foreground">Link naar de online offerte</p>
              <p className="break-all text-sm text-muted-foreground">{resultaat.link}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(resultaat.link).catch(() => undefined);
                    setGekopieerd(true);
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" /> {gekopieerd ? "Gekopieerd" : "Link kopiëren"}
                </Button>
                <a href={resultaat.whatsapp} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-secondary md:h-9">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Delen via WhatsApp
                </a>
              </div>
            </div>
            <div className="flex justify-end border-t border-border pt-3">
              <Button type="button" onClick={onSluit}>
                Klaar
              </Button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
