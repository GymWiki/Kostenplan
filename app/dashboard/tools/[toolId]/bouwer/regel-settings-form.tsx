"use client";

import { useState } from "react";
import type { Expression, PriceRule, PriceRuleCategory, StaffelSchijf } from "@/app/lib/calculator-engine";
import { RUNNING_SUBTOTAL_VARIABLE } from "@/app/lib/calculator-engine";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { HelpTip } from "@/app/components/ui/help-tip";
import { Trash2, Plus } from "lucide-react";
import { numeriekeVariabelen, type BeschikbareVariabele } from "./variabelen-utils";
import { VoorwaardeEditor, ontleedVoorwaarde, bouwVoorwaarde, legeConditie, type VoorwaardeGroep } from "./voorwaarde-editor";
import { Bedragveld } from "./bedragveld";

type BouwbaarType = "VAST" | "PER_EENHEID" | "PERCENTAGE" | "TOESLAG" | "KORTING" | "STAFFEL";

const TYPE_LABELS: Record<BouwbaarType, string> = {
  VAST: "Vast bedrag",
  PER_EENHEID: "Aantal × prijs per eenheid",
  PERCENTAGE: "Percentage van het bedrag tot nu toe",
  TOESLAG: "Toeslag (erbij)",
  KORTING: "Korting (eraf)",
  STAFFEL: "Staffelprijs (per schijf)",
};

const CATEGORIE_LABELS: Record<PriceRuleCategory, string> = {
  MATERIAAL: "Materiaal",
  ARBEID: "Arbeid",
  TRANSPORT: "Transport",
  TOESLAG: "Toeslag",
  KORTING: "Korting",
  OVERIG: "Overig",
};

type RegelFormState = {
  type: BouwbaarType;
  label: string;
  categorie: PriceRuleCategory;
  actief: boolean;
  intern: boolean;
  toonInUitsplitsing: boolean;
  bedrag: string;
  hoeveelheidVariabele: string;
  prijsPerEenheid: string;
  prijsPerEenheidVariabele: string;
  prijsBron: "vast" | "variabele";
  eenheid: string;
  percentage: string;
  kortingType: "percentage" | "bedrag";
  kortingWaarde: string;
  schijven: { tot: string; prijsPerEenheid: string }[];
  heeftVoorwaarde: boolean;
  voorwaardeGroep: VoorwaardeGroep;
};

function initieleState(regel: PriceRule, variabelen: BeschikbareVariabele[]): RegelFormState {
  const type: BouwbaarType = regel.type !== "FORMULE" ? regel.type : "VAST";
  const voorwaarde = ontleedVoorwaarde(regel.voorwaarde);
  return {
    type,
    label: regel.label,
    categorie: regel.categorie,
    actief: regel.actief,
    intern: regel.intern,
    toonInUitsplitsing: regel.toonInUitsplitsing,
    bedrag: "bedrag" in regel && regel.bedrag?.kind === "GETAL" ? String(regel.bedrag.waarde) : "",
    hoeveelheidVariabele:
      "hoeveelheid" in regel && regel.hoeveelheid.kind === "VARIABELE" ? regel.hoeveelheid.naam : (numeriekeVariabelen(variabelen)[0]?.naam ?? ""),
    prijsPerEenheid: regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "GETAL" ? String(regel.prijsPerEenheid.waarde) : "",
    prijsPerEenheidVariabele: regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "VARIABELE" ? regel.prijsPerEenheid.naam : "",
    prijsBron: regel.type === "PER_EENHEID" && regel.prijsPerEenheid.kind === "VARIABELE" ? "variabele" : "vast",
    eenheid: "eenheid" in regel ? regel.eenheid : "",
    percentage: regel.type === "PERCENTAGE" && regel.percentage.kind === "GETAL" ? String(regel.percentage.waarde) : "",
    kortingType: regel.type === "KORTING" && regel.bedrag ? "bedrag" : "percentage",
    kortingWaarde:
      regel.type === "KORTING"
        ? regel.percentage?.kind === "GETAL"
          ? String(regel.percentage.waarde)
          : regel.bedrag?.kind === "GETAL"
            ? String(regel.bedrag.waarde)
            : ""
        : "",
    schijven: regel.type === "STAFFEL" ? regel.schijven.map((s) => ({ tot: s.tot == null ? "" : String(s.tot), prijsPerEenheid: String(s.prijsPerEenheid) })) : [],
    heeftVoorwaarde: voorwaarde != null,
    voorwaardeGroep: voorwaarde ?? { combinator: "EN", condities: [] },
  };
}

// Zie veld-settings-form.tsx voor dezelfde "altijd committeren, geen
// blokkerende Opslaan-validatie" filosofie — onvolledige tussenstanden
// (geen naam, geen schijven) worden opgevangen door validate.ts, niet hier.
function bouwRegel(id: string, s: RegelFormState, variabelen: BeschikbareVariabele[]): PriceRule {
  const voorwaarde: Expression | undefined = s.heeftVoorwaarde ? bouwVoorwaarde(s.voorwaardeGroep, variabelen) : undefined;
  const basis = { id, label: s.label, categorie: s.categorie, actief: s.actief, intern: s.intern, toonInUitsplitsing: s.toonInUitsplitsing, voorwaarde };

  if (s.type === "STAFFEL") {
    const geldigeSchijven: StaffelSchijf[] = s.schijven
      .map((schijf) => ({ tot: schijf.tot.trim() === "" ? null : Number(schijf.tot), prijsPerEenheid: Number(schijf.prijsPerEenheid) || 0 }))
      .filter((schijf) => Number.isFinite(schijf.prijsPerEenheid));
    return {
      ...basis,
      type: "STAFFEL",
      hoeveelheid: { kind: "VARIABELE", naam: s.hoeveelheidVariabele },
      eenheid: s.eenheid || "stuks",
      schijven: geldigeSchijven,
    };
  }

  switch (s.type) {
    case "VAST":
      return { ...basis, type: "VAST", bedrag: { kind: "GETAL", waarde: Number(s.bedrag) || 0 } };
    case "TOESLAG":
      return { ...basis, type: "TOESLAG", bedrag: { kind: "GETAL", waarde: Number(s.bedrag) || 0 } };
    case "PERCENTAGE":
      return {
        ...basis,
        type: "PERCENTAGE",
        basis: { kind: "VARIABELE", naam: RUNNING_SUBTOTAL_VARIABLE },
        percentage: { kind: "GETAL", waarde: Number(s.percentage) || 0 },
      };
    case "KORTING":
      return {
        ...basis,
        type: "KORTING",
        percentage: s.kortingType === "percentage" ? { kind: "GETAL", waarde: Number(s.kortingWaarde) || 0 } : undefined,
        bedrag: s.kortingType === "bedrag" ? { kind: "GETAL", waarde: Number(s.kortingWaarde) || 0 } : undefined,
      };
    case "PER_EENHEID": {
      const prijsExpr: Expression =
        s.prijsBron === "variabele" && s.prijsPerEenheidVariabele
          ? { kind: "VARIABELE", naam: s.prijsPerEenheidVariabele }
          : { kind: "GETAL", waarde: Number(s.prijsPerEenheid) || 0 };
      return {
        ...basis,
        type: "PER_EENHEID",
        hoeveelheid: { kind: "VARIABELE", naam: s.hoeveelheidVariabele },
        prijsPerEenheid: prijsExpr,
        eenheid: s.eenheid || "stuks",
      };
    }
  }
}

// Instellingenpaneel (kolom 2) voor precies één geselecteerde Prijsregel —
// de inline tegenhanger van RegelFormModal (regels-tab.tsx, nog gebruikt
// door v1-tools). Zie veld-settings-form.tsx voor de commit-per-wijziging-
// aanpak; `key={regel.id}` op de aanroepplek reset lokale state per selectie.
export function RegelSettingsForm({
  regel,
  canChangeType,
  variabelen,
  onChange,
}: {
  regel: PriceRule;
  canChangeType: boolean;
  variabelen: BeschikbareVariabele[];
  onChange: (regel: PriceRule) => void;
}) {
  const [state, setState] = useState<RegelFormState>(() => initieleState(regel, variabelen));
  const numerieke = numeriekeVariabelen(variabelen);

  function commit(overrides: Partial<RegelFormState>) {
    const next = { ...state, ...overrides };
    setState(next);
    onChange(bouwRegel(regel.id, next, variabelen));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regel-label">Naam</Label>
        <Input id="regel-label" value={state.label} onChange={(e) => commit({ label: e.target.value })} placeholder="Bijv. Materiaal" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regel-type">Hoe wordt dit berekend?</Label>
          <Select id="regel-type" value={state.type} onChange={(e) => commit({ type: e.target.value as BouwbaarType })} disabled={!canChangeType}>
            {Object.entries(TYPE_LABELS).map(([waarde, tekst]) => (
              <option key={waarde} value={waarde}>
                {tekst}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regel-categorie">Categorie</Label>
          <Select id="regel-categorie" value={state.categorie} onChange={(e) => commit({ categorie: e.target.value as PriceRuleCategory })}>
            {Object.entries(CATEGORIE_LABELS).map(([waarde, tekst]) => (
              <option key={waarde} value={waarde}>
                {tekst}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state.type === "VAST" && <Bedragveld label="Bedrag" waarde={state.bedrag} onChange={(bedrag) => commit({ bedrag })} />}
      {state.type === "TOESLAG" && <Bedragveld label="Toeslagbedrag" waarde={state.bedrag} onChange={(bedrag) => commit({ bedrag })} />}

      {state.type === "PER_EENHEID" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-hoeveelheid">Hoeveelheid (welke vraag?)</Label>
            <Select id="regel-hoeveelheid" value={state.hoeveelheidVariabele} onChange={(e) => commit({ hoeveelheidVariabele: e.target.value })}>
              {numerieke.map((v) => (
                <option key={v.naam} value={v.naam}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Prijs per eenheid</Label>
            <div className="flex gap-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={state.prijsBron === "vast"} onChange={() => commit({ prijsBron: "vast" })} className="accent-primary" />
                Vast bedrag
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={state.prijsBron === "variabele"} onChange={() => commit({ prijsBron: "variabele" })} className="accent-primary" />
                Prijs van een materiaalkeuze
              </label>
            </div>
            {state.prijsBron === "vast" ? (
              <Bedragveld label="" waarde={state.prijsPerEenheid} onChange={(prijsPerEenheid) => commit({ prijsPerEenheid })} />
            ) : (
              <Select value={state.prijsPerEenheidVariabele} onChange={(e) => commit({ prijsPerEenheidVariabele: e.target.value })}>
                <option value="" disabled>
                  Kies een materiaalkeuze
                </option>
                {variabelen
                  .filter((v) => v.naam.endsWith("Prijs"))
                  .map((v) => (
                    <option key={v.naam} value={v.naam}>
                      {v.label}
                    </option>
                  ))}
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-eenheid">Eenheid</Label>
            <Input id="regel-eenheid" value={state.eenheid} onChange={(e) => commit({ eenheid: e.target.value })} placeholder="Bijv. meter, m², uur" />
          </div>
        </>
      )}

      {state.type === "PERCENTAGE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regel-percentage">Percentage van het bedrag tot nu toe</Label>
          <div className="relative">
            <DecimalInput id="regel-percentage" value={state.percentage} onChange={(e) => commit({ percentage: e.target.value })} className="pr-8" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
      )}

      {state.type === "KORTING" && (
        <div className="flex flex-col gap-2">
          <Label>Korting</Label>
          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={state.kortingType === "percentage"} onChange={() => commit({ kortingType: "percentage" })} className="accent-primary" />
              Percentage
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={state.kortingType === "bedrag"} onChange={() => commit({ kortingType: "bedrag" })} className="accent-primary" />
              Vast bedrag
            </label>
          </div>
          <div className="relative">
            <DecimalInput value={state.kortingWaarde} onChange={(e) => commit({ kortingWaarde: e.target.value })} className={state.kortingType === "percentage" ? "pr-8" : "pl-7"} />
            {state.kortingType === "percentage" ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            ) : (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            )}
          </div>
        </div>
      )}

      {state.type === "STAFFEL" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-staffel-hoeveelheid">Hoeveelheid (welke vraag?)</Label>
            <Select id="regel-staffel-hoeveelheid" value={state.hoeveelheidVariabele} onChange={(e) => commit({ hoeveelheidVariabele: e.target.value })}>
              {numerieke.map((v) => (
                <option key={v.naam} value={v.naam}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="regel-staffel-eenheid">Eenheid</Label>
            <Input id="regel-staffel-eenheid" value={state.eenheid} onChange={(e) => commit({ eenheid: e.target.value })} placeholder="Bijv. meter" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5">
              <Label>Schijven</Label>
              <HelpTip contentKey="kosteninstellingen.bandbreedteModus" />
            </span>
            {state.schijven.map((schijf, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">t/m</span>
                <Input
                  value={schijf.tot}
                  onChange={(e) => {
                    const nieuw = [...state.schijven];
                    nieuw[i] = { ...schijf, tot: e.target.value };
                    commit({ schijven: nieuw });
                  }}
                  placeholder="onbeperkt"
                  className="w-24"
                />
                <span className="shrink-0 text-muted-foreground">à €</span>
                <DecimalInput
                  value={schijf.prijsPerEenheid}
                  onChange={(e) => {
                    const nieuw = [...state.schijven];
                    nieuw[i] = { ...schijf, prijsPerEenheid: e.target.value };
                    commit({ schijven: nieuw });
                  }}
                  className="w-24"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => commit({ schijven: state.schijven.filter((_, j) => j !== i) })} aria-label="Verwijderen">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => commit({ schijven: [...state.schijven, { tot: "", prijsPerEenheid: "" }] })}>
              <Plus className="h-3.5 w-3.5" />
              Schijf toevoegen
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Alleen toepassen onder een voorwaarde</span>
          <Switch
            checked={state.heeftVoorwaarde}
            onChange={(e) =>
              commit({
                heeftVoorwaarde: e.target.checked,
                voorwaardeGroep: state.voorwaardeGroep.condities.length > 0 ? state.voorwaardeGroep : { combinator: "EN", condities: [legeConditie(variabelen)] },
              })
            }
          />
        </label>
        {state.heeftVoorwaarde && <VoorwaardeEditor groep={state.voorwaardeGroep} onChange={(voorwaardeGroep) => commit({ voorwaardeGroep })} variabelen={variabelen} />}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Zichtbaar in de kostenuitsplitsing</span>
          <Switch checked={state.toonInUitsplitsing} onChange={(e) => commit({ toonInUitsplitsing: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            Alleen voor jou zichtbaar (marge/inkoopprijs)
            <HelpTip contentKey="kosteninstellingen.zichtbaarVsActief" />
          </span>
          <Switch checked={state.intern} onChange={(e) => commit({ intern: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Ingeschakeld</span>
          <Switch checked={state.actief} onChange={(e) => commit({ actief: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}
