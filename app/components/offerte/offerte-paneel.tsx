"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { BedragVeld, GetalVeld } from "@/app/components/ui/getal-veld";
import { BETAAL_PRESETS, termijnenKloppen, termijnenVoor } from "@/app/lib/offerte/gegevens";
import { BTW_TARIEVEN, REGEL_SOORT_LABEL, type RegelSoort } from "@/app/lib/offerte/btw-config";
import { berekenTotalen, prijsPerEenheidWeergave } from "@/app/lib/offerte/bereken";
import { REGEL_TYPE_LABEL, type OfferteInhoud, type OfferteRegel, type RegelType } from "@/app/lib/offerte/model";
import { formatCents } from "@/app/lib/offerte/weergave";
import * as w from "@/app/lib/offerte/wijzig";
import type { StandaardRegelDto } from "@/app/lib/actions/offerte-v2";
import type { Selectie } from "./offerte-document";

export type Wijzig = (fn: (i: OfferteInhoud) => OfferteInhoud) => void;

function Acties({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 border-t border-border pt-3">{children}</div>;
}

export function KlantPaneel({ inhoud, wijzig }: { inhoud: OfferteInhoud; wijzig: Wijzig }) {
  const k = inhoud.klant;
  const zet = (patch: Partial<typeof k>) => wijzig((i) => ({ ...i, klant: { ...i.klant, ...patch } }));
  const adres = (a: typeof k.adres, set: (p: Partial<typeof k.adres>) => void, p: string) => (
    <>
      <Field label="Straat en huisnummer" htmlFor={`${p}-straat`}>
        <Input id={`${p}-straat`} value={a.straat} onChange={(e) => set({ straat: e.target.value })} autoComplete="street-address" />
      </Field>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="Postcode" htmlFor={`${p}-pc`}>
          <Input id={`${p}-pc`} value={a.postcode} onChange={(e) => set({ postcode: e.target.value })} autoComplete="postal-code" />
        </Field>
        <Field label="Plaats" htmlFor={`${p}-plaats`}>
          <Input id={`${p}-plaats`} value={a.plaats} onChange={(e) => set({ plaats: e.target.value })} autoComplete="address-level2" />
        </Field>
      </div>
    </>
  );
  return (
    <div className="flex flex-col gap-4">
      <Field label="Soort klant" htmlFor="kl-type" hint={`Particulieren zien prijzen incl. btw, zakelijke klanten excl. btw.${"factuur" in inhoud && k.type === "zakelijk" ? " Btw verlegd (onderaanneming) kies je bij Datums en btw." : ""}`}>
        <Select id="kl-type" value={k.type} onChange={(e) => wijzig((i) => w.zetKlantType(i, e.target.value as "particulier" | "zakelijk"))}>
          <option value="particulier">Particulier</option>
          <option value="zakelijk">Zakelijk</option>
        </Select>
      </Field>
      {k.type === "zakelijk" && (
        <Field label="Bedrijfsnaam" htmlFor="kl-bedrijf">
          <Input id="kl-bedrijf" value={k.bedrijfsnaam} onChange={(e) => zet({ bedrijfsnaam: e.target.value })} autoComplete="organization" />
        </Field>
      )}
      <Field label={k.type === "zakelijk" ? "Contactpersoon" : "Naam"} htmlFor="kl-naam">
        <Input id="kl-naam" value={k.naam} onChange={(e) => zet({ naam: e.target.value })} autoComplete="name" />
      </Field>
      {adres(k.adres, (p) => zet({ adres: { ...k.adres, ...p } }), "kl")}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="E-mailadres" htmlFor="kl-email">
          <Input id="kl-email" type="email" inputMode="email" value={k.email} onChange={(e) => zet({ email: e.target.value })} autoComplete="email" />
        </Field>
        <Field label="Telefoon" htmlFor="kl-tel">
          <Input id="kl-tel" type="tel" inputMode="tel" value={k.telefoon} onChange={(e) => zet({ telefoon: e.target.value })} autoComplete="tel" />
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground">
        Projectadres is hetzelfde als het adres van de klant
        <Switch checked={inhoud.projectadresGelijk} onChange={(e) => wijzig((i) => ({ ...i, projectadresGelijk: e.target.checked }))} aria-label="Projectadres gelijk aan klantadres" />
      </label>
      {!inhoud.projectadresGelijk && adres(inhoud.projectadres, (p) => wijzig((i) => ({ ...i, projectadres: { ...i.projectadres, ...p } })), "pr")}
    </div>
  );
}

export function MetaPaneel({ inhoud, wijzig }: { inhoud: OfferteInhoud; wijzig: Wijzig }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Offertenummer" htmlFor="mt-nr" hint="Wordt automatisch toegekend en nooit hergebruikt.">
        <Input id="mt-nr" value={inhoud.nummer} readOnly />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Datum" htmlFor="mt-datum">
          <Input id="mt-datum" type="date" value={inhoud.datum} onChange={(e) => wijzig((i) => ({ ...i, datum: e.target.value }))} />
        </Field>
        <Field label="Geldig tot" htmlFor="mt-tot">
          <Input id="mt-tot" type="date" value={inhoud.geldigTot} onChange={(e) => wijzig((i) => ({ ...i, geldigTot: e.target.value }))} />
        </Field>
      </div>
    </div>
  );
}

export function TekstPaneel({ inhoud, wijzig, veld }: { inhoud: OfferteInhoud; wijzig: Wijzig; veld: "onderwerp" | "introductie" | "slottekst" }) {
  const labels = { onderwerp: "Onderwerp", introductie: "Introductie", slottekst: "Slottekst" } as const;
  return (
    <Field label={labels[veld]} htmlFor="tx-veld" hint={veld === "introductie" ? "Staat onder de aanhef, met de naam van de klant." : undefined}>
      {veld === "onderwerp" ? (
        <Input id="tx-veld" value={inhoud.onderwerp} onChange={(e) => wijzig((i) => ({ ...i, onderwerp: e.target.value }))} />
      ) : (
        <Textarea id="tx-veld" className="min-h-40" value={inhoud[veld]} onChange={(e) => wijzig((i) => ({ ...i, [veld]: e.target.value }))} />
      )}
    </Field>
  );
}

export function RegelPaneel({
  inhoud,
  sectieId,
  regelId,
  wijzig,
  standaardRegels,
  onSlaStandaardOp,
  onKlaar,
}: {
  inhoud: OfferteInhoud;
  sectieId: string;
  regelId: string;
  wijzig: Wijzig;
  standaardRegels: StandaardRegelDto[];
  onSlaStandaardOp: (r: OfferteRegel) => void;
  onKlaar?: (nieuweSelectie: Selectie | null) => void;
}) {
  const sectie = inhoud.secties.find((s) => s.id === sectieId);
  const r = sectie?.regels.find((x) => x.id === regelId);
  if (!sectie || !r) return <p className="text-sm text-muted-foreground">Deze regel bestaat niet meer.</p>;
  const idx = sectie.regels.findIndex((x) => x.id === regelId);
  const zet = (patch: Partial<OfferteRegel>) => wijzig((i) => w.wijzigRegel(i, sectieId, regelId, patch));
  const t = berekenTotalen(inhoud);
  const toonIncl = t.toonIncl;
  return (
    <div className="flex flex-col gap-4">
      <Field label="Soort regel" htmlFor="rg-type">
        <Select id="rg-type" value={r.type} onChange={(e) => zet({ type: e.target.value as RegelType })}>
          {(Object.keys(REGEL_TYPE_LABEL) as RegelType[]).map((k) => (
            <option key={k} value={k}>
              {REGEL_TYPE_LABEL[k]}
              {k === "stelpost" ? " (geschat, op nacalculatie)" : k === "optioneel" ? " (klant kiest zelf)" : k === "tekst" ? " (geen bedrag)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {r.label === "stelpost-open" && (
        <div role="note" className="flex flex-col gap-2 rounded-lg border border-example/60 bg-example/15 p-3 text-sm text-foreground">
          <p>
            <strong>Stelpost.</strong> In de offerte was dit een schatting. Vul hieronder de werkelijke hoeveelheid in. Klopt de geschatte hoeveelheid al, bevestig dat dan zodat je de factuur definitief kunt maken.
          </p>
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => zet({ label: undefined, toelichting: `Werkelijke hoeveelheid ${r.aantal} ${r.eenheid}` })}>
              Hoeveelheid klopt
            </Button>
          </div>
        </div>
      )}
      <Field label="Omschrijving" htmlFor="rg-omschr">
        <Input id="rg-omschr" value={r.omschrijving} onChange={(e) => zet({ omschrijving: e.target.value })} />
      </Field>
      {r.type !== "tekst" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <GetalVeld id="rg-aantal" label="Aantal" waarde={r.aantal} onChange={(n) => zet({ aantal: Math.round(n * 10000) / 10000 })} />
            <Field label="Eenheid" htmlFor="rg-eenheid">
              <Input id="rg-eenheid" value={r.eenheid} onChange={(e) => zet({ eenheid: e.target.value })} />
            </Field>
          </div>
          <BedragVeld id="rg-prijs" label="Prijs per eenheid excl. btw" centen={r.prijsCenten} onChange={(c) => zet({ prijsCenten: c })} hint={toonIncl && !t.kor ? `Klant ziet ${formatCents(prijsPerEenheidWeergave(r, true, false))} incl. btw.` : undefined} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Btw" htmlFor="rg-btw" hint={t.kor ? "KOR: er wordt geen btw berekend." : undefined}>
              <Select id="rg-btw" value={String(r.btw)} disabled={t.kor} onChange={(e) => zet({ btw: Number(e.target.value) })}>
                {BTW_TARIEVEN.map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
              </Select>
            </Field>
            <GetalVeld id="rg-korting" label="Korting (%)" max={100} waarde={r.kortingPct ?? 0} onChange={(n) => zet({ kortingPct: Math.min(100, n) || undefined })} />
          </div>
          <Field label="Soort (voor het standaard btw-tarief)" htmlFor="rg-soort">
            <Select
              id="rg-soort"
              value={r.soort}
              onChange={(e) => zet({ soort: e.target.value as RegelSoort })}
            >
              {(Object.keys(REGEL_SOORT_LABEL) as RegelSoort[]).map((k) => (
                <option key={k} value={k}>
                  {REGEL_SOORT_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
      <Field label="Toelichting onder de regel" htmlFor="rg-toel">
        <Input id="rg-toel" value={r.toelichting ?? ""} maxLength={300} onChange={(e) => zet({ toelichting: e.target.value || undefined })} />
      </Field>
      {t.regels[r.id] && r.type !== "tekst" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          Regeltotaal: <strong>{formatCents(toonIncl ? t.regels[r.id].incl : t.regels[r.id].excl)}</strong> {t.kor ? "" : toonIncl ? "incl. btw" : "excl. btw"}
        </p>
      )}
      <Acties>
        <Button type="button" variant="outline" size="sm" disabled={idx === 0} onClick={() => wijzig((i) => w.verplaatsRegel(i, sectieId, regelId, -1))} aria-label="Regel omhoog">
          <ArrowUp className="h-4 w-4" aria-hidden="true" /> Omhoog
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={idx === sectie.regels.length - 1} onClick={() => wijzig((i) => w.verplaatsRegel(i, sectieId, regelId, 1))} aria-label="Regel omlaag">
          <ArrowDown className="h-4 w-4" aria-hidden="true" /> Omlaag
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const d = w.dupliceerRegel(inhoud, sectieId, regelId);
            wijzig(() => d.inhoud);
            if (d.nieuweId) onKlaar?.({ soort: "regel", id: d.nieuweId, sectieId });
          }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" /> Dupliceren
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onSlaStandaardOp(r)} disabled={r.type === "tekst" || !r.omschrijving.trim()}>
          <Save className="h-4 w-4" aria-hidden="true" /> Bewaar als standaardregel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => {
            wijzig((i) => w.verwijderRegel(i, sectieId, regelId));
            onKlaar?.({ soort: "sectie", id: sectieId });
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Verwijderen
        </Button>
      </Acties>
      {inhoud.secties.length > 1 && (
        <Field label="Verplaats naar sectie" htmlFor="rg-sectie">
          <Select
            id="rg-sectie"
            value={sectieId}
            onChange={(e) => {
              wijzig((i) => w.verplaatsRegelNaarSectie(i, regelId, e.target.value));
              onKlaar?.({ soort: "regel", id: regelId, sectieId: e.target.value });
            }}
          >
            {inhoud.secties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titel || "Zonder titel"}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {standaardRegels.length > 0 && <p className="sr-only">Standaardregels staan bij de sectie.</p>}
    </div>
  );
}

export function SectiePaneel({
  inhoud,
  sectieId,
  wijzig,
  standaardRegels,
  onVerwijderStandaard,
  onSelect,
  btwStandaard,
}: {
  inhoud: OfferteInhoud;
  sectieId: string;
  wijzig: Wijzig;
  standaardRegels: StandaardRegelDto[];
  onVerwijderStandaard: (id: string) => void;
  onSelect: (s: Selectie) => void;
  btwStandaard?: Partial<Record<RegelSoort, number>> | null;
}) {
  const sectie = inhoud.secties.find((s) => s.id === sectieId);
  if (!sectie) return <p className="text-sm text-muted-foreground">Deze sectie bestaat niet meer.</p>;
  const idx = inhoud.secties.findIndex((s) => s.id === sectieId);
  const voeg = (r: OfferteRegel) => {
    wijzig((i) => w.voegRegelToe(i, sectieId, r));
    onSelect({ soort: "regel", id: r.id, sectieId });
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Titel van de sectie" htmlFor="sc-titel" hint="Bijvoorbeeld de naam van het onderdeel uit je rekentool.">
        <Input id="sc-titel" value={sectie.titel} onChange={(e) => wijzig((i) => w.wijzigSectieTitel(i, sectieId, e.target.value))} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => voeg(w.nieuweRegel("materiaal", btwStandaard))}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Regel toevoegen
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => voeg(w.nieuweRegel("overig", btwStandaard, { type: "tekst", aantal: 0, eenheid: "", btw: 21 }))}>
          Tekstregel
        </Button>
      </div>
      {standaardRegels.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-semibold text-foreground">Standaardregels</legend>
          {standaardRegels.map((s) => (
            <div key={s.id} className="flex items-center gap-1 rounded-lg border border-border bg-card pl-3">
              <button
                type="button"
                className="min-h-11 min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium text-foreground"
                onClick={() => voeg(w.nieuweRegel(s.soort as RegelSoort, btwStandaard, { omschrijving: s.omschrijving, eenheid: s.eenheid, prijsCenten: s.prijsCenten, btw: s.btw }))}
              >
                {s.omschrijving} · {formatCents(s.prijsCenten)} / {s.eenheid}
              </button>
              <button type="button" aria-label={`${s.omschrijving} verwijderen uit standaardregels`} className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => onVerwijderStandaard(s.id)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </fieldset>
      )}
      <Acties>
        <Button type="button" variant="outline" size="sm" disabled={idx === 0} onClick={() => wijzig((i) => w.verplaatsSectie(i, sectieId, -1))}>
          <ArrowUp className="h-4 w-4" aria-hidden="true" /> Omhoog
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={idx === inhoud.secties.length - 1} onClick={() => wijzig((i) => w.verplaatsSectie(i, sectieId, 1))}>
          <ArrowDown className="h-4 w-4" aria-hidden="true" /> Omlaag
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const d = w.dupliceerSectie(inhoud, sectieId);
            wijzig(() => d.inhoud);
            if (d.id) onSelect({ soort: "sectie", id: d.id });
          }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" /> Dupliceren
        </Button>
        <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => wijzig((i) => w.verwijderSectie(i, sectieId))}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Sectie verwijderen
        </Button>
      </Acties>
    </div>
  );
}

export function BetalingPaneel({ inhoud, wijzig }: { inhoud: OfferteInhoud; wijzig: Wijzig }) {
  const preset = termijnenKloppen(inhoud.betaaltermijnen) ? (Object.keys(BETAAL_PRESETS).find((k) => k !== "EIGEN" && JSON.stringify(termijnenVoor(k, null)) === JSON.stringify(inhoud.betaaltermijnen)) ?? "EIGEN") : "EIGEN";
  const termijnen = inhoud.betaaltermijnen;
  const zet = (t: typeof termijnen) => wijzig((i) => ({ ...i, betaaltermijnen: t }));
  return (
    <div className="flex flex-col gap-4">
      <Field label="Betaalvoorwaarden" htmlFor="bt-preset">
        <Select id="bt-preset" value={preset} onChange={(e) => zet(termijnenVoor(e.target.value, termijnen))}>
          {Object.entries(BETAAL_PRESETS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>
      {preset === "EIGEN" && (
        <div className="flex flex-col gap-2">
          {termijnen.map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={`Termijn ${i + 1}`} htmlFor={`bt-l${i}`} className="flex-1">
                <Input id={`bt-l${i}`} value={t.label} onChange={(e) => zet(termijnen.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              </Field>
<div className="w-24"><GetalVeld id={`bt-p${i}`} label="%" geheel max={100} waarde={t.percentage} onChange={(n) => zet(termijnen.map((x, j) => (j === i ? { ...x, percentage: n } : x)))} /></div>
              <Button type="button" variant="outline" aria-label={`Termijn ${i + 1} verwijderen`} disabled={termijnen.length < 2} onClick={() => zet(termijnen.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => zet([...termijnen, { label: "Termijn", percentage: 0 }])}>
            Termijn toevoegen
          </Button>
          {!termijnenKloppen(termijnen) && <p role="alert" className="text-sm font-medium text-destructive">De termijnen moeten samen 100% zijn.</p>}
        </div>
      )}
    </div>
  );
}

export function PlanningPaneel({ inhoud, wijzig }: { inhoud: OfferteInhoud; wijzig: Wijzig }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Verwachte startweek" htmlFor="pl-week" hint="Een indicatie; op de offerte staat dat het geen vaste afspraak is.">
        <Input id="pl-week" type="week" value={/^\d{4}-W\d{2}$/.test(inhoud.planning.startweek) ? inhoud.planning.startweek : ""} onChange={(e) => wijzig((i) => ({ ...i, planning: { ...i.planning, startweek: e.target.value } }))} />
      </Field>
      <Field label="Verwachte doorlooptijd" htmlFor="pl-duur">
        <Input id="pl-duur" value={inhoud.planning.doorlooptijd} placeholder="Bijvoorbeeld 3 werkdagen" onChange={(e) => wijzig((i) => ({ ...i, planning: { ...i.planning, doorlooptijd: e.target.value } }))} />
      </Field>
    </div>
  );
}

export function VoorwaardenPaneel({ inhoud, wijzig, toonHerroeping }: { inhoud: OfferteInhoud; wijzig: Wijzig; toonHerroeping: boolean }) {
  const v = inhoud.voorwaarden;
  const zet = (n: string[]) => wijzig((i) => ({ ...i, voorwaarden: n }));
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-foreground">Voorwaarden en uitsluitingen</legend>
        {v.map((tekst, i) => (
          <div key={i} className="flex items-start gap-1">
            <Textarea aria-label={`Voorwaarde ${i + 1}`} className="min-h-16" value={tekst} onChange={(e) => zet(v.map((x, j) => (j === i ? e.target.value : x)))} />
            <div className="flex flex-col">
              <button type="button" aria-label="Omhoog" disabled={i === 0} className="flex h-11 w-9 cursor-pointer items-center justify-center disabled:opacity-30" onClick={() => zet(v.map((x, j) => (j === i - 1 ? v[i] : j === i ? v[i - 1] : x)))}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Voorwaarde verwijderen" className="flex h-11 w-9 cursor-pointer items-center justify-center text-destructive" onClick={() => zet(v.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => zet([...v, ""])}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Voorwaarde toevoegen
        </Button>
      </fieldset>
      {toonHerroeping && (
        <fieldset className="flex flex-col gap-2">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground">
            Herroepingsrecht vermelden
            <Switch checked={inhoud.herroeping.aan} onChange={(e) => wijzig((i) => ({ ...i, herroeping: { ...i.herroeping, aan: e.target.checked } }))} aria-label="Herroepingsrecht vermelden" />
          </label>
          {inhoud.herroeping.aan && <Textarea aria-label="Tekst herroepingsrecht" className="min-h-32" value={inhoud.herroeping.tekst} onChange={(e) => wijzig((i) => ({ ...i, herroeping: { ...i.herroeping, tekst: e.target.value } }))} />}
        </fieldset>
      )}
      <p className="text-sm text-muted-foreground">
        De algemene voorwaarden ({inhoud.bijlagen.length > 0 ? inhoud.bijlagen[0].naam : "nog niet geüpload"}) worden als bijlage meegestuurd. Je beheert ze bij Profiel → Offerte-instellingen.
      </p>
    </div>
  );
}
