"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Loader2, Mail, MessageCircle, Share2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { useIsMobiel } from "@/app/components/mobile/use-mobiel";
import { bevestigHerinneringAction, bevestigVerstuurdAction, maakDeelklaarAction, maakHerinneringKlaarAction, type DeelKlaar, type DeelKlaarResultaat } from "@/app/lib/actions/offerte-v2";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { mailtoLink, whatsappDeelLink } from "@/app/lib/offerte/berichten";
import { controleerOfferte, type ControlePunt } from "@/app/lib/offerte/controle";
import type { OfferteInhoud } from "@/app/lib/offerte/model";
import { formatCents } from "@/app/lib/offerte/weergave";

type Kanaal = "mail" | "delen" | "whatsapp" | "link";

type Punt = { id: string; bericht: string; actie?: ControlePunt["actie"]; href?: string };

// Wat verschilt per soort document (offerte of factuur); alles is optioneel en valt terug op de offerte.
export type DeelOps = {
  startStap?: "controle" | "delen";
  controle: { blokkerend: Punt[]; waarschuwingen: Punt[]; ok: { id: string; bericht: string }[] };
  controleTitel: string;
  // Tekst onder de controlelijst (bijv. "Na definitief maken krijgt deze factuur nummer … en kun je hem niet meer wijzigen.")
  controleToelichting?: string;
  controleKnop: string;
  terugKnop: string;
  // Uit te voeren bij de controleknop vóór het delen (factuur: definitief maken). Daarna wordt het bericht klaargezet.
  naControle?: () => Promise<{ ok: true } | { ok: false; error: string }>;
  titelDelen: string;
  maakKlaar: () => Promise<DeelKlaarResultaat>;
  bevestig: (kanaal: Kanaal) => Promise<{ ok: true } | { ok: false; error: string }>;
  woord: string; // "offerte" | "factuur" | "creditnota" | "herinnering"
  vraag: string;
  verstuurdTitel: string;
  verstuurdTekst: string;
  neeTekst: string;
  wachtTekst: string;
};

export type DeelDialoogProps = {
  open: boolean;
  onSluit: () => void;
  offerteId: string;
  inhoud: OfferteInhoud;
  // "offerte": controleren en delen; "herinnering": alleen delen met de herinneringstekst.
  modus?: "offerte" | "herinnering";
  onGaNaar: (actie: NonNullable<ControlePunt["actie"]>) => void;
  onVerstuurd: () => void;
  // Voor een factuur: de eigen controle, acties en teksten.
  ops?: DeelOps;
};

// Controleren en versturen: eerst de checklist (blokkerend of waarschuwing), dan het bericht (aanpasbaar) met
// de manieren om te delen — het deelmenu van de telefoon (met de PDF), de eigen mail, WhatsApp,
// link kopiëren of de PDF downloaden — en daarna de vraag "Is de offerte verstuurd?".
// Er wordt niets automatisch verstuurd en niets aangenomen: pas na "Ja" wordt de offerte Verstuurd.
export function DeelDialoog(props: DeelDialoogProps) {
  // Alleen gemonteerd zolang hij open is: elke keer opnieuw bij de eerste stap.
  return props.open ? <DeelInhoud {...props} /> : null;
}

function DeelInhoud({ onSluit, offerteId, inhoud, modus = "offerte", onGaNaar, onVerstuurd, ops }: DeelDialoogProps) {
  const herinnering = modus === "herinnering";
  const [stap, setStap] = useState<"controle" | "delen" | "klaar" | "nee">(ops ? (ops.startStap ?? "controle") : herinnering ? "delen" : "controle");
  const [klaar, setKlaar] = useState<DeelKlaar | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [onderwerp, setOnderwerp] = useState("");
  const [tekst, setTekst] = useState("");
  const [gebruikt, setGebruikt] = useState<Kanaal | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const mobiel = useIsMobiel();
  const c = ops?.controle ?? { ...controleerOfferte(inhoud) };
  const t = berekenTotalen(inhoud);
  const totaal = t.toonIncl || t.kor ? t.totaalIncl : t.totaalExcl;

  const neemOver = (r: DeelKlaarResultaat) => {
    if (!r.ok) {
      setFout(r.error);
      return false;
    }
    setKlaar(r);
    setOnderwerp(r.onderwerp);
    setTekst(r.tekst);
    return true;
  };

  // Herinnering: meteen het bericht klaarzetten (de offerte is al verstuurd en vergrendeld).
  useEffect(() => {
    if (!herinnering && !(ops && ops.startStap === "delen")) return;
    let weg = false;
    void (ops ? ops.maakKlaar() : maakHerinneringKlaarAction(offerteId)).then((r) => {
      if (!weg) neemOver(r);
    });
    return () => {
      weg = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [herinnering, offerteId]);

  async function naarDelen() {
    setBezig(true);
    setFout(null);
    if (ops?.naControle) {
      const eerst = await ops.naControle();
      if (!eerst.ok) {
        setBezig(false);
        return setFout(eerst.error);
      }
    }
    const r = await (ops ? ops.maakKlaar() : maakDeelklaarAction(offerteId));
    setBezig(false);
    if (neemOver(r)) setStap("delen");
  }

  const mailHref = klaar ? mailtoLink({ naar: klaar.klantEmail, onderwerp, tekst }) : "#";
  const waHref = klaar ? whatsappDeelLink(tekst, klaar.klantTelefoon) : "#";
  const kanShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function deelViaSysteem() {
    if (!klaar) return;
    setFout(null);
    try {
      const data: ShareData = { title: onderwerp, text: tekst };
      try {
        const blob = await (await fetch(klaar.pdfUrl)).blob();
        const file = new File([blob], klaar.pdfNaam, { type: "application/pdf" });
        // Kan de browser geen bestanden delen, dan delen we alleen tekst en link.
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
      } catch {
        // PDF ophalen mislukt: alleen tekst + link delen
      }
      await navigator.share(data);
      setGebruikt("delen");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // gebruiker sloot het deelmenu: niets aannemen
      setFout("Het deelmenu kon niet worden geopend. Gebruik een van de andere knoppen.");
    }
  }

  async function bevestig() {
    setBezig(true);
    setFout(null);
    const r = ops ? await ops.bevestig(gebruikt ?? "link") : herinnering ? await bevestigHerinneringAction(offerteId) : await bevestigVerstuurdAction(offerteId, gebruikt ?? "link");
    setBezig(false);
    if (!r.ok) return setFout(r.error);
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
              <Link href={p.href ?? "/dashboard/profiel/bedrijfsgegevens"} className="font-semibold underline">
                Aanpassen
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

  const knop = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground hover:bg-secondary";

  return (
    <Overlay open onClose={onSluit} ariaLabelledBy="ctl-titel" className="flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:rounded-2xl">
        <button type="button" aria-label="Sluiten" onClick={onSluit} className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {stap === "controle" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              {ops?.controleTitel ?? "Controleren en versturen"}
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
            {ops?.controleToelichting && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{ops.controleToelichting}</p>}
            {fout && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{fout}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={onSluit}>
                {ops?.terugKnop ?? "Terug naar de offerte"}
              </Button>
              <Button type="button" disabled={c.blokkerend.length > 0 || bezig} onClick={naarDelen}>
                {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {ops?.controleKnop ?? "Verder naar versturen"}
              </Button>
            </div>
          </>
        )}

        {stap === "delen" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              {ops ? ops.titelDelen : herinnering ? `Herinnering sturen voor offerte ${inhoud.nummer}` : `Offerte ${inhoud.nummer} van ${formatCents(totaal)} versturen`}
            </h2>
            {!klaar && !fout && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {ops?.wachtTekst ?? "Even geduld, de offerte wordt klaargezet…"}
              </p>
            )}
            {fout && !klaar && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{fout}</p>}
            {klaar && (
              <>
                <p className="text-sm text-muted-foreground">
                  Jij verstuurt de {ops?.woord ?? "offerte"} zelf, via je eigen mail, WhatsApp of het deelmenu. Controleer en pas het bericht hieronder aan; de link naar de online {ops?.woord ?? "offerte"} (met de PDF om te downloaden) staat erin.
                </p>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  Onderwerp
                  <input value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} className="h-11 rounded-md border-[1.5px] border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  Bericht
                  <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={10} className="rounded-md border-[1.5px] border-input bg-card px-3 py-2 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35" />
                </label>
                {klaar.klantEmail && <p className="text-sm text-muted-foreground">Aan: {klaar.klantEmail}</p>}
                {fout && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{fout}</p>}

                <div className="flex flex-wrap gap-2">
                  {mobiel && kanShare && (
                    <Button type="button" onClick={deelViaSysteem}>
                      <Share2 className="h-4 w-4" aria-hidden="true" /> Delen (met PDF)
                    </Button>
                  )}
                  <a href={mailHref} onClick={() => setGebruikt("mail")} className={mobiel && kanShare ? knop : `${knop} border-transparent bg-primary text-primary-foreground hover:bg-primary-hover`}>
                    <Mail className="h-4 w-4" aria-hidden="true" /> Mail openen
                  </a>
                  <a href={waHref} target="_blank" rel="noreferrer" onClick={() => setGebruikt("whatsapp")} className={knop}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Delen via WhatsApp
                  </a>
                  <button
                    type="button"
                    className={knop}
                    onClick={async () => {
                      await navigator.clipboard?.writeText(klaar.link).catch(() => undefined);
                      setGekopieerd(true);
                      setGebruikt((g) => g ?? "link");
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" /> {gekopieerd ? "Link gekopieerd" : "Link kopiëren"}
                  </button>
                  <a href={klaar.pdfUrl} download={klaar.pdfNaam} className={knop}>
                    <Download className="h-4 w-4" aria-hidden="true" /> PDF downloaden
                  </a>
                </div>

                <section aria-label={ops?.vraag ?? "Is de offerte verstuurd?"} className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
                  <h3 className="text-sm font-bold text-foreground">{ops?.vraag ?? (herinnering ? "Is de herinnering verstuurd?" : "Is de offerte verstuurd?")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {gebruikt
                      ? `Je hebt het bericht geopend. Weet je zeker dat het is verstuurd? Pas dan zetten we de ${ops?.woord ?? "offerte"} op Verstuurd.`
                      : `Klik hier pas op Ja nadat je het bericht echt hebt verstuurd. Doe je dat niet, dan blijft de ${ops?.woord ?? "offerte"} ${ops?.woord && ops.woord !== "offerte" ? "onverstuurd" : "een concept"}.`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={bezig} onClick={bevestig}>
                      {bezig ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} Ja, verstuurd
                    </Button>
                    <Button type="button" variant="outline" disabled={bezig} onClick={() => setStap("nee")}>
                      Nee, nog niet
                    </Button>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {stap === "nee" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              {ops ? "Prima, het is niet als verstuurd gemarkeerd" : "Prima, het blijft een concept"}
            </h2>
            <p className="text-sm text-foreground">
              {ops ? ops.neeTekst : herinnering ? "De herinnering is niet als verstuurd gemarkeerd." : "De offerte is niet als verstuurd gemarkeerd. Je kunt hem later opnieuw delen via Controleren en versturen. Past iets niet? Pas het eerst aan; de PDF wordt dan opnieuw gemaakt."}
            </p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={() => setStap("delen")}>
                Terug
              </Button>
              <Button type="button" onClick={onSluit}>
                Sluiten
              </Button>
            </div>
          </>
        )}

        {stap === "klaar" && (
          <>
            <h2 id="ctl-titel" className="pr-10 text-xl font-bold text-foreground">
              {ops ? ops.verstuurdTitel : herinnering ? "Herinnering genoteerd" : "Offerte staat op Verstuurd"}
            </h2>
            <p className="text-sm text-foreground">
              {ops ? ops.verstuurdTekst : herinnering ? "Je ziet de herinnering terug bij de activiteit van deze offerte." : `Verstuurd op ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}. Je krijgt een melding in de app zodra de klant de offerte bekijkt, akkoord geeft, een vraag stelt of afwijst.`}
            </p>
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
