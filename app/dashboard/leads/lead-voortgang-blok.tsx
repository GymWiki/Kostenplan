"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Select } from "@/app/components/ui/input";
import { Sheet } from "@/app/components/ui/sheet";
import { cn } from "@/app/lib/cn";
import { heropenLeadAction, markeerOpgeleverdAction, markeerVerlorenAction, planInAction, zetInContactAction } from "@/app/lib/actions/lead-voortgang";
import { maakEindfactuurAction, maakFactuurUitOfferteAction, maakLosseFactuurAction } from "@/app/lib/actions/facturen";
import { FASE_LABEL, HOOFDPAD, VERLOREN_REDENEN, type LeadFase } from "@/app/lib/lead-fase";
import { FACTUUR_STATUS_LABEL } from "@/app/lib/factuur/model";
import { formatCents, formatDatumTijd } from "@/app/lib/offerte/weergave";
import type { LeadVoortgang } from "@/app/lib/lead-voortgang";

const vandaag = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
type Dialoog = null | "inplannen" | "opleveren" | "verloren" | "factureren";

// Voortgangsbalk (hoofdpad), zijpad-label, de ene volgende actie, facturen en tijdlijn van een lead.
export function VoortgangBalk({ fase }: { fase: LeadFase }) {
  const zijpad = !HOOFDPAD.includes(fase);
  const index = HOOFDPAD.indexOf(fase);
  return (
    <div>
      <ol className="flex gap-1" aria-label="Voortgang">
        {HOOFDPAD.map((f, i) => (
          <li key={f} className="min-w-0 flex-1" aria-current={f === fase ? "step" : undefined}>
            <span className={cn("block h-2 rounded-full", zijpad ? "bg-border" : i <= index ? "bg-primary" : "bg-border")} />
            <span className="sr-only">{FASE_LABEL[f]}{!zijpad && i < index ? " (klaar)" : ""}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {zijpad ? <Badge variant="warning">{FASE_LABEL[fase]}</Badge> : <span className="font-semibold text-foreground">Stap {index + 1} van {HOOFDPAD.length}: {FASE_LABEL[fase]}</span>}
      </p>
    </div>
  );
}

export function LeadVoortgangBlok({ leadId, naam, voortgang: v }: { leadId: string; naam: string; voortgang: LeadVoortgang }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [dialoog, setDialoog] = useState<Dialoog>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [week, setWeek] = useState("");
  const [datum, setDatum] = useState(vandaag());
  const [reden, setReden] = useState<string>(VERLOREN_REDENEN[0]);
  const [eigenReden, setEigenReden] = useState("");

  const klaar = (r: { ok: true } | { ok: false; error: string }) => {
    if (r.ok) {
      setDialoog(null);
      setFout(null);
      router.refresh();
    } else setFout(r.error);
  };
  const uitvoeren = (f: () => Promise<{ ok: true } | { ok: false; error: string }>) => start(async () => klaar(await f()));
  const naarFactuur = (r: { ok: true; eerste: string } | { ok: false; error: string; bestaande?: string[] }) => {
    if (r.ok) router.push(`/dashboard/facturen/${r.eerste}`);
    else if (r.bestaande?.[0]) router.push(`/dashboard/facturen/${r.bestaande[0]}`);
    else setFout(r.error);
  };

  const a = v.actie;
  function doeActie() {
    if (!a) return;
    setFout(null);
    switch (a.soort) {
      case "in-contact":
        return uitvoeren(() => zetInContactAction(leadId));
      case "offerte-maken":
      case "offerte-openen":
        return router.push(`/dashboard/leads/${leadId}/offerte`);
      case "inplannen":
        return setDialoog("inplannen");
      case "opleveren":
        setDatum(vandaag());
        return setDialoog("opleveren");
      case "factureren":
        return setDialoog("factureren");
      case "factuur-openen":
      case "herinneren":
        return router.push(`/dashboard/facturen/${a.factuurId}`);
    }
  }

  const verlopen = v.fase === "verloren";
  const kanVerliezen = !["betaald", "verloren", "gefactureerd"].includes(v.fase);
  const heeftEind = v.facturen.some((f) => f.soort === "eindfactuur" && f.status !== "CONCEPT");
  const heeftTermijn = v.facturen.some((f) => f.soort === "termijn");
  const geenFacturen = v.facturen.filter((f) => f.soort !== "creditnota").length === 0;

  return (
    <section aria-label="Voortgang" className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <VoortgangBalk fase={v.fase} />
      {v.toelichting && <p className="text-sm text-muted-foreground">Reden: {v.toelichting}</p>}
      {v.teLaatDagen ? <p className="text-sm font-semibold text-destructive">Een factuur is {v.teLaatDagen} {v.teLaatDagen === 1 ? "dag" : "dagen"} te laat · {formatCents(v.teLaatCenten)} openstaand</p> : v.openstaandCenten > 0 ? <p className="text-sm text-muted-foreground">{formatCents(v.openstaandCenten)} openstaand</p> : null}
      {a && (
        <Button type="button" size="lg" onClick={doeActie} disabled={bezig} className="w-full">
          <span className="text-xs font-normal opacity-80">Volgende:</span> {a.label}
        </Button>
      )}
      {!a && v.fase === "betaald" && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary"><Check className="h-4 w-4" aria-hidden="true" /> Afgerond en betaald</p>
      )}
      <div className="flex flex-wrap gap-x-4 text-sm">
        {v.fase === "akkoord" && <button type="button" className="min-h-11 text-left font-medium underline" onClick={() => { setDatum(vandaag()); setDialoog("opleveren"); }}>Direct opgeleverd</button>}
        {v.offerteId && a?.soort !== "factureren" && ["akkoord", "ingepland", "opgeleverd"].includes(v.fase) && (
          <button type="button" className="min-h-11 text-left font-medium underline" onClick={() => setDialoog("factureren")}>Factuur maken</button>
        )}
        {kanVerliezen && <button type="button" className="min-h-11 text-left font-medium text-muted-foreground underline" onClick={() => { setFout(null); setDialoog("verloren"); }}>Markeer als verloren</button>}
        {verlopen && <button type="button" className="min-h-11 text-left font-medium underline" onClick={() => uitvoeren(() => heropenLeadAction(leadId))}>Zet weer open</button>}
      </div>
      {fout && !dialoog && <p role="alert" className="text-sm text-destructive">{fout}</p>}

      {v.facturen.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-semibold">Facturen</h4>
          <ul className="flex flex-col text-sm">
            {v.facturen.map((f) => (
              <li key={f.id}>
                <Link href={`/dashboard/facturen/${f.id}`} className="flex min-h-11 items-center justify-between gap-2 underline-offset-2 hover:underline">
                  <span className="min-w-0 truncate">{f.nummer ?? "Concept"}{f.soort === "creditnota" ? " · creditnota" : f.soort === "termijn" ? " · termijn" : f.soort === "eindfactuur" ? " · eindfactuur" : ""}</span>
                  <span className="shrink-0 text-muted-foreground">{FACTUUR_STATUS_LABEL[f.status]} · {formatCents(f.totaalInclCenten)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Tijdlijn</summary>
        <ol className="flex flex-col gap-1.5 text-sm">
          {v.tijdlijn.map((t, i) => (
            <li key={i} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{formatDatumTijd(t.tijdstip)}</span>
              {t.href ? <Link href={t.href} className="underline-offset-2 hover:underline">{t.tekst}</Link> : <span>{t.tekst}</span>}
            </li>
          ))}
        </ol>
      </details>

      <Sheet open={dialoog === "inplannen"} onClose={() => setDialoog(null)} title="Inplannen" description={`In welke week begin je bij ${naam}?`}>
        <Field label="Startweek" htmlFor="lv-week"><Input id="lv-week" type="week" value={week} onChange={(e) => setWeek(e.target.value)} /></Field>
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
        <Button type="button" disabled={bezig} onClick={() => uitvoeren(() => planInAction(leadId, week))}>Ingepland</Button>
      </Sheet>

      <Sheet open={dialoog === "opleveren"} onClose={() => setDialoog(null)} title="Opgeleverd" description="De opleverdatum wordt de uitvoeringsdatum op je factuur.">
        <Field label="Opgeleverd op" htmlFor="lv-datum"><Input id="lv-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></Field>
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
        <Button type="button" disabled={bezig} onClick={() => uitvoeren(() => markeerOpgeleverdAction(leadId, datum))}>Opgeleverd</Button>
      </Sheet>

      <Sheet open={dialoog === "verloren"} onClose={() => setDialoog(null)} title="Markeer als verloren" description="Je kunt de lead later weer openzetten.">
        <Field label="Reden" htmlFor="lv-reden">
          <Select id="lv-reden" value={reden} onChange={(e) => setReden(e.target.value)}>
            {VERLOREN_REDENEN.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        {reden === "Anders" && <Field label="Welke reden?" htmlFor="lv-eigen"><Input id="lv-eigen" value={eigenReden} onChange={(e) => setEigenReden(e.target.value)} /></Field>}
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
        <Button type="button" variant="destructive" disabled={bezig} onClick={() => uitvoeren(() => markeerVerlorenAction(leadId, reden === "Anders" ? eigenReden : reden))}>Markeer als verloren</Button>
      </Sheet>

      <Sheet open={dialoog === "factureren"} onClose={() => setDialoog(null)} title="Factuur maken" description="Je maakt een concept en controleert het voordat je het definitief maakt.">
        <div className="flex flex-col gap-2">
          {v.offerteId && geenFacturen && (
            <>
              <Button type="button" disabled={bezig} onClick={() => start(async () => naarFactuur(await maakFactuurUitOfferteAction(v.offerteId!, "totaal")))}>Eén factuur voor het totaal</Button>
              <Button type="button" variant="outline" disabled={bezig} onClick={() => start(async () => naarFactuur(await maakFactuurUitOfferteAction(v.offerteId!, "termijnen")))}>Termijnfacturen volgens de offerte</Button>
            </>
          )}
          {v.offerteId && heeftTermijn && !heeftEind && (
            <Button type="button" disabled={bezig} onClick={() => start(async () => naarFactuur(await maakEindfactuurAction(v.offerteId!)))}>Eindfactuur (trekt de termijnen af)</Button>
          )}
          <Button type="button" variant="ghost" disabled={bezig} onClick={() => start(async () => naarFactuur(await maakLosseFactuurAction(leadId)))}>Losse factuur zonder offerte</Button>
        </div>
        {fout && <p role="alert" className="text-sm text-destructive">{fout}</p>}
      </Sheet>
    </section>
  );
}
