"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { Field } from "@/app/components/ui/field";
import { Input, Select } from "@/app/components/ui/input";
import { Sheet } from "@/app/components/ui/sheet";
import { registreerBetalingAction, verwijderBetalingAction, maakCreditnotaAction } from "@/app/lib/actions/facturen-beheer";
import { HERINNERING_LABEL, type HerinneringStap } from "@/app/lib/factuur/betaling";
import { FACTUUR_STATUS_LABEL } from "@/app/lib/factuur/model";
import { formatCents, formatDatum, formatDatumTijd } from "@/app/lib/offerte/weergave";

export type BeheerData = {
  id: string;
  isCreditnota: boolean;
  status: keyof typeof FACTUUR_STATUS_LABEL;
  totaalInclCenten: number;
  betaaldCenten: number;
  gecrediteerdCenten: number;
  openstaandCenten: number;
  vervaldatum: string | null;
  dagenTeLaat: number | null;
  volgende: HerinneringStap | null;
  betalingen: { id: string; datum: string; bedragCenten: number; methode: string; notitie: string | null }[];
  gebeurtenissen: { id: string; soort: string; tekst: string | null; bedragCenten: number | null; tijdstip: string }[];
  regels: { id: string; omschrijving: string; bedragExclCenten: number }[];
  creditnotas: { id: string; nummer: string | null; status: string }[];
  creditVoor: { id: string; nummer: string | null } | null;
};

const METHODE: Record<string, string> = { OVERBOEKING: "Overboeking", CONTANT: "Contant", PIN: "Pin", BETAALLINK: "Betaallink", OVERIG: "Overig" };
const SOORT: Record<string, string> = {
  AANGEMAAKT: "Aangemaakt",
  DEFINITIEF: "Definitief gemaakt",
  VERZONDEN: "Verstuurd",
  BEKEKEN: "Bekeken door de klant",
  BETALING: "Betaling ontvangen",
  HERINNERING: "Herinnering verstuurd",
  AANMANING: "Aanmaning verstuurd",
  LAATSTE_HERINNERING: "Laatste herinnering verstuurd",
  CREDITNOTA: "Creditnota",
  NOTITIE: "Notitie",
};

const naarCenten = (t: string) => {
  const v = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
};
const vandaag = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

// Beheer van een definitieve factuur: status, betalingen, herinneringen, creditnota en tijdlijn.
export function FactuurBeheerPaneel({ data, onHerinnering }: { data: BeheerData; onHerinnering: (stap: HerinneringStap) => void }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [betaalOpen, setBetaalOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [weg, setWeg] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bedrag, setBedrag] = useState("");
  const [datum, setDatum] = useState(vandaag());
  const [methode, setMethode] = useState("OVERBOEKING");
  const [notitie, setNotitie] = useState("");
  const [gekozen, setGekozen] = useState<string[]>([]);
  const kanBetalen = !data.isCreditnota && data.openstaandCenten > 0 && data.status !== "GECREDITEERD";
  const kanCrediteren = !data.isCreditnota && data.status !== "GECREDITEERD";

  function opent() {
    setBedrag((data.openstaandCenten / 100).toFixed(2).replace(".", ","));
    setDatum(vandaag());
    setFout(null);
    setBetaalOpen(true);
  }
  function betaal() {
    const c = naarCenten(bedrag);
    start(async () => {
      const r = await registreerBetalingAction({ factuurId: data.id, bedragCenten: c, datum, methode: methode as "OVERBOEKING", notitie });
      if (r.ok) {
        setBetaalOpen(false);
        setNotitie("");
        router.refresh();
      } else setFout(r.error);
    });
  }
  function crediteer() {
    start(async () => {
      const r = await maakCreditnotaAction(data.id, gekozen.length > 0 ? gekozen : undefined);
      if (r.ok) router.push(`/dashboard/facturen/${r.id}`);
      else setFout(r.error);
    });
  }

  return (
    <section aria-label="Beheer van deze factuur" className="flex flex-col gap-4 border-b border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.status === "BETAALD" ? "success" : data.dagenTeLaat ? "warning" : "default"}>{FACTUUR_STATUS_LABEL[data.status]}</Badge>
        {data.dagenTeLaat ? <Badge variant="warning">{data.dagenTeLaat} {data.dagenTeLaat === 1 ? "dag" : "dagen"} te laat</Badge> : null}
        {data.creditVoor && <span className="text-sm text-muted-foreground">Creditnota bij factuur {data.creditVoor.nummer}</span>}
      </div>
      {!data.isCreditnota && (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Totaal</dt><dd className="font-semibold">{formatCents(data.totaalInclCenten)}</dd></div>
          <div><dt className="text-muted-foreground">Betaald</dt><dd className="font-semibold">{formatCents(data.betaaldCenten)}</dd></div>
          {data.gecrediteerdCenten > 0 && <div><dt className="text-muted-foreground">Gecrediteerd</dt><dd className="font-semibold">{formatCents(data.gecrediteerdCenten)}</dd></div>}
          <div><dt className="text-muted-foreground">Openstaand{data.vervaldatum ? ` · vervalt ${formatDatum(data.vervaldatum)}` : ""}</dt><dd className="font-semibold">{formatCents(data.openstaandCenten)}</dd></div>
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        {kanBetalen && <Button type="button" onClick={opent}>Betaling registreren</Button>}
        {kanBetalen && data.volgende && (
          <Button type="button" variant="outline" onClick={() => onHerinnering(data.volgende!)}>
            {HERINNERING_LABEL[data.volgende]}
          </Button>
        )}
        {kanCrediteren && <Button type="button" variant="outline" onClick={() => { setGekozen([]); setFout(null); setCreditOpen(true); }}>Crediteren</Button>}
      </div>
      {data.creditnotas.length > 0 && (
        <ul className="text-sm text-muted-foreground">
          {data.creditnotas.map((c) => (
            <li key={c.id}><a className="underline" href={`/dashboard/facturen/${c.id}`}>{c.nummer ? `Creditnota ${c.nummer}` : "Concept-creditnota"}</a></li>
          ))}
        </ul>
      )}
      {data.betalingen.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-bold">Betalingen</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {data.betalingen.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{formatDatum(b.datum)} · {formatCents(b.bedragCenten)} · {METHODE[b.methode] ?? b.methode}{b.notitie ? ` · ${b.notitie}` : ""}</span>
                <Button type="button" size="sm" variant="ghost" aria-label={`Betaling van ${formatCents(b.bedragCenten)} verwijderen`} onClick={() => setWeg(b.id)}>Verwijderen</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-bold">Tijdlijn</summary>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          {data.gebeurtenissen.map((g) => (
            <li key={g.id}>{formatDatumTijd(new Date(g.tijdstip))} · {SOORT[g.soort] ?? g.soort}{g.bedragCenten ? ` ${formatCents(g.bedragCenten)}` : ""}{g.tekst ? ` (${g.tekst})` : ""}</li>
          ))}
        </ul>
      </details>
      {fout && !betaalOpen && !creditOpen && <p role="alert" className="text-sm text-destructive">{fout}</p>}

      <Sheet open={betaalOpen} onClose={() => { setBetaalOpen(false); setFout(null); }} title="Betaling registreren" description={`Openstaand: ${formatCents(data.openstaandCenten)}`}>
        <Field label="Bedrag (€)" htmlFor="bt-bedrag"><Input id="bt-bedrag" inputMode="decimal" value={bedrag} onChange={(e) => setBedrag(e.target.value)} /></Field>
        <Field label="Datum ontvangen" htmlFor="bt-datum"><Input id="bt-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></Field>
        <Field label="Hoe is er betaald?" htmlFor="bt-methode">
          <Select id="bt-methode" value={methode} onChange={(e) => setMethode(e.target.value)}>
            {Object.entries(METHODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Notitie (optioneel)" htmlFor="bt-notitie"><Input id="bt-notitie" value={notitie} onChange={(e) => setNotitie(e.target.value)} /></Field>
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
        <Button type="button" onClick={betaal} disabled={bezig}>{bezig ? "Opslaan…" : "Betaling opslaan"}</Button>
      </Sheet>

      <Sheet open={creditOpen} onClose={() => { setCreditOpen(false); setFout(null); }} title="Creditnota maken" description="Je maakt een concept-creditnota. Controleer hem en maak hem daarna definitief; de factuur zelf blijft ongewijzigd.">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Welke regels crediteer je? (niets gekozen = de hele factuur)</legend>
          {data.regels.map((r) => (
            <label key={r.id} className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={gekozen.includes(r.id)} onChange={(e) => setGekozen((l) => (e.target.checked ? [...l, r.id] : l.filter((x) => x !== r.id)))} />
              <span className="min-w-0 flex-1 truncate">{r.omschrijving}</span>
              <span>{formatCents(r.bedragExclCenten)}</span>
            </label>
          ))}
        </fieldset>
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
        <Button type="button" onClick={crediteer} disabled={bezig}>{bezig ? "Bezig…" : "Concept-creditnota maken"}</Button>
      </Sheet>

      <ConfirmDialog
        open={weg !== null}
        onClose={() => setWeg(null)}
        pending={bezig}
        title="Betaling verwijderen?"
        description="Gebruik dit alleen als de betaling per ongeluk is geregistreerd. Het staat in de tijdlijn."
        onConfirm={() =>
          start(async () => {
            const r = await verwijderBetalingAction(data.id, weg!);
            setWeg(null);
            if (r.ok) router.refresh();
            else setFout(r.error);
          })
        }
      />
    </section>
  );
}
