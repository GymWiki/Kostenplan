"use client";

import { useRef, useState } from "react";
import type { CalculatorField, DerivedVariable, Expression, KeuzeOptie } from "@/app/lib/calculator-engine";
import { upsertProductKeuzeOptiesAction, type ProductKeuzeOptieInvoer } from "@/app/lib/actions/calculator-config";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { beschikbareVariabelen } from "./variabelen-utils";
import { VoorwaardeEditor, ontleedVoorwaarde, bouwVoorwaarde, legeConditie, type VoorwaardeGroep } from "./voorwaarde-editor";
import { KeuzeOptiesEditor } from "./keuze-opties-editor";
import { ProductOptiesEditor } from "./product-opties-editor";
import { AdvancedSettings } from "./advanced-settings";
import { SOORT_LABELS, SOORT_UITLEG } from "./veld-soort-labels";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";

type VeldFormState = {
  soort: CalculatorField["soort"];
  label: string;
  helpTekst: string;
  verplicht: boolean;
  eenheid: string;
  min: string;
  max: string;
  stap: string;
  metHoogte: boolean;
  opties: KeuzeOptie[];
  heeftZichtbaarAls: boolean;
  zichtbaarAlsGroep: VoorwaardeGroep;
  heeftVerplichtAls: boolean;
  verplichtAlsGroep: VoorwaardeGroep;
};

function initieleState(veld: CalculatorField): VeldFormState {
  const zichtbaarAls = ontleedVoorwaarde(veld.zichtbaarAls);
  const verplichtAls = ontleedVoorwaarde(veld.verplichtAls);
  return {
    soort: veld.soort,
    label: veld.label,
    helpTekst: veld.helpTekst ?? "",
    verplicht: veld.verplicht,
    eenheid: "eenheid" in veld ? (veld.eenheid ?? "") : "",
    min: "min" in veld ? String(veld.min ?? "") : "",
    max: "max" in veld ? String(veld.max ?? "") : "",
    stap: "stap" in veld ? String(veld.stap ?? "") : "",
    metHoogte: veld.soort === "AFMETINGEN" ? veld.metHoogte : false,
    opties: "opties" in veld ? veld.opties : [],
    heeftZichtbaarAls: zichtbaarAls != null,
    zichtbaarAlsGroep: zichtbaarAls ?? { combinator: "EN", condities: [] },
    heeftVerplichtAls: verplichtAls != null,
    verplichtAlsGroep: verplichtAls ?? { combinator: "EN", condities: [] },
  };
}

// Bouwt een compleet, geldig CalculatorField uit de huidige formulierstate —
// altijd, ook met een leeg label of nul opties. Er is bewust geen
// blokkerende validatie meer hier (zoals VeldFormModal die had vóór
// "Opslaan"): elke wijziging committeert meteen (Deel: "geen save-knoppen
// na iedere wijziging"), dus onvolledige tussenstanden zijn normaal terwijl
// iemand typt. De meldingen-banner in onderdelen-bouwer.tsx (gevoed door
// valideerCalculatorConfig, zie validate.ts) vangt precies deze twee
// gevallen (leeg label, geen opties) alsnog op als FOUT.
function bouwVeld(id: string, s: VeldFormState, conditieVariabelen: ReturnType<typeof beschikbareVariabelen>): CalculatorField {
  const zichtbaarAls: Expression | undefined = s.heeftZichtbaarAls ? bouwVoorwaarde(s.zichtbaarAlsGroep, conditieVariabelen) : undefined;
  const verplichtAls: Expression | undefined = s.heeftVerplichtAls ? bouwVoorwaarde(s.verplichtAlsGroep, conditieVariabelen) : undefined;
  const basis = { id, label: s.label, helpTekst: s.helpTekst.trim() || undefined, verplicht: s.verplicht, zichtbaarAls, verplichtAls };

  switch (s.soort) {
    case "NUMMER":
    case "AANTAL":
    case "OPPERVLAKTE":
      return {
        ...basis,
        soort: s.soort,
        eenheid: s.eenheid.trim() || undefined,
        min: s.min !== "" ? Number(s.min) : undefined,
        max: s.max !== "" ? Number(s.max) : undefined,
        stap: s.stap !== "" ? Number(s.stap) : undefined,
      };
    case "SLIDER":
      return {
        ...basis,
        soort: "SLIDER",
        eenheid: s.eenheid.trim() || undefined,
        min: s.min !== "" ? Number(s.min) : 0,
        max: s.max !== "" ? Number(s.max) : 100,
        stap: s.stap !== "" ? Number(s.stap) : 1,
      };
    case "TEKST":
      return { ...basis, soort: "TEKST" };
    case "JA_NEE":
      return { ...basis, soort: "JA_NEE" };
    case "CHECKBOX":
      return { ...basis, soort: "CHECKBOX" };
    case "DROPDOWN":
      return { ...basis, soort: "DROPDOWN", opties: s.opties };
    case "RADIO":
      return { ...basis, soort: "RADIO", opties: s.opties };
    case "MEERKEUZE":
      return { ...basis, soort: "MEERKEUZE", opties: s.opties };
    case "AFMETINGEN":
      return { ...basis, soort: "AFMETINGEN", eenheid: s.eenheid.trim() || "meter", metHoogte: s.metHoogte };
    case "PRODUCT_KEUZE":
      // Wordt nooit via dit pad gebouwd — zie handleProductKeuzeAanmaken/
      // handleProductOptiesChange hieronder, die de server-round-trip nodig
      // hebben voor materialCategoryId vóórdat er iets te committeren valt.
      throw new Error("PRODUCT_KEUZE wordt via een apart pad opgeslagen.");
  }
}

// Instellingenpaneel (kolom 2) voor precies één geselecteerde Vraag — de
// inline tegenhanger van VeldFormModal (velden-tab.tsx, nog gebruikt door
// v1-tools). Geen Overlay, geen Opslaan/Annuleren: elke wijziging roept
// direct onChange aan, wat via de bestaande debounced autosave in
// onderdelen-bouwer.tsx naar de server gaat. `key={veld.id}` op de
// aanroepplek (builder-tree.tsx) zorgt dat deze form z'n eigen lokale state
// vers initialiseert zodra een andere Vraag geselecteerd wordt — geen
// syncing-effect nodig.
export function VeldSettingsForm({
  toolId,
  veld,
  canChangeType,
  overigeVelden,
  afgeleideVariabelen,
  materiaalOpties,
  onMateriaalOptiesChange,
  onChange,
}: {
  toolId: string;
  veld: CalculatorField;
  canChangeType: boolean;
  overigeVelden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  materiaalOpties: Record<string, MateriaalOptie[]>;
  onMateriaalOptiesChange: (materiaalOpties: Record<string, MateriaalOptie[]>) => void;
  onChange: (veld: CalculatorField) => void;
}) {
  const [state, setState] = useState<VeldFormState>(() => initieleState(veld));
  const [productOpties, setProductOpties] = useState<ProductKeuzeOptieInvoer[]>(
    veld.soort === "PRODUCT_KEUZE" ? (materiaalOpties[veld.materialCategoryId] ?? []) : []
  );
  const [productKeuzeFout, setProductKeuzeFout] = useState<string | null>(null);
  const [productKeuzeBezig, setProductKeuzeBezig] = useState(false);
  const productOptiesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conditieVariabelen = beschikbareVariabelen(overigeVelden, afgeleideVariabelen);

  function commit(overrides: Partial<VeldFormState>) {
    const next = { ...state, ...overrides };
    setState(next);
    if (next.soort !== "PRODUCT_KEUZE") {
      onChange(bouwVeld(veld.id, next, conditieVariabelen));
    }
  }

  async function handleProductOptiesChange(nieuweOpties: ProductKeuzeOptieInvoer[]) {
    setProductOpties(nieuweOpties);
    if (veld.soort !== "PRODUCT_KEUZE") return;
    // Bestaand PRODUCT_KEUZE-veld: materialCategoryId is al stabiel, dus
    // elke wijziging mag debounced auto-opslaan (idempotente upsert op een
    // bekende categorie — geen risico op dubbele Product/MaterialCategory-
    // rijen zoals bij de allereerste aanmaak, zie handleProductKeuzeAanmaken).
    if (productOptiesTimer.current) clearTimeout(productOptiesTimer.current);
    productOptiesTimer.current = setTimeout(async () => {
      const geldig = nieuweOpties.filter((o) => o.naam.trim().length > 0);
      if (geldig.length === 0) return;
      const result = await upsertProductKeuzeOptiesAction(toolId, veld.soort === "PRODUCT_KEUZE" ? veld.materialCategoryId : null, state.label.trim() || "Materiaalkeuze", geldig);
      if (!("error" in result)) {
        onMateriaalOptiesChange({
          ...materiaalOpties,
          [result.materialCategoryId]: geldig.map((o, i) => ({ id: o.id ?? `nieuw-${i}-${Date.now()}`, naam: o.naam, prijs: o.prijs })),
        });
      }
    }, 700);
  }

  async function handleProductKeuzeAanmaken() {
    if (!state.label.trim()) {
      setProductKeuzeFout("Vul eerst een vraagtekst in.");
      return;
    }
    const geldig = productOpties.filter((o) => o.naam.trim().length > 0);
    if (geldig.length === 0) {
      setProductKeuzeFout("Voeg minimaal één materiaal-/productoptie toe.");
      return;
    }
    setProductKeuzeBezig(true);
    setProductKeuzeFout(null);
    const result = await upsertProductKeuzeOptiesAction(toolId, null, state.label.trim(), geldig);
    setProductKeuzeBezig(false);
    if ("error" in result) {
      setProductKeuzeFout(result.error);
      return;
    }
    onMateriaalOptiesChange({
      ...materiaalOpties,
      [result.materialCategoryId]: geldig.map((o, i) => ({ id: o.id ?? `nieuw-${i}-${Date.now()}`, naam: o.naam, prijs: o.prijs })),
    });
    const zichtbaarAls: Expression | undefined = state.heeftZichtbaarAls ? bouwVoorwaarde(state.zichtbaarAlsGroep, conditieVariabelen) : undefined;
    const verplichtAls: Expression | undefined = state.heeftVerplichtAls ? bouwVoorwaarde(state.verplichtAlsGroep, conditieVariabelen) : undefined;
    onChange({
      id: veld.id,
      label: state.label.trim(),
      helpTekst: state.helpTekst.trim() || undefined,
      verplicht: state.verplicht,
      zichtbaarAls,
      verplichtAls,
      soort: "PRODUCT_KEUZE",
      materialCategoryId: result.materialCategoryId,
    });
  }

  const isKeuzeSoort = state.soort === "DROPDOWN" || state.soort === "RADIO" || state.soort === "MEERKEUZE";
  const isNieuwProductKeuze = state.soort === "PRODUCT_KEUZE" && veld.soort !== "PRODUCT_KEUZE";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="veld-soort">Type vraag</Label>
        <Select
          id="veld-soort"
          value={state.soort}
          onChange={(e) => commit({ soort: e.target.value as CalculatorField["soort"] })}
          disabled={!canChangeType}
        >
          {Object.entries(SOORT_LABELS).map(([waarde, tekst]) => (
            <option key={waarde} value={waarde}>
              {tekst}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">{SOORT_UITLEG[state.soort]}</p>
        {!canChangeType && <p className="text-xs text-muted-foreground">Het type wijzigen kan niet meer — verwijder de vraag en maak &apos;m opnieuw aan.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="veld-label">Wat wil je weten?</Label>
        <Input id="veld-label" value={state.label} onChange={(e) => commit({ label: e.target.value })} placeholder="Bijv. Hoeveel meter schutting?" autoFocus />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="veld-help">Toelichting (optioneel)</Label>
        <Input id="veld-help" value={state.helpTekst} onChange={(e) => commit({ helpTekst: e.target.value })} placeholder="Extra uitleg voor je klant" />
      </div>

      {(state.soort === "NUMMER" || state.soort === "AANTAL" || state.soort === "OPPERVLAKTE" || state.soort === "SLIDER" || state.soort === "AFMETINGEN") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veld-eenheid">Eenheid</Label>
          <Input id="veld-eenheid" value={state.eenheid} onChange={(e) => commit({ eenheid: e.target.value })} placeholder="Bijv. meter, m², stuks" />
        </div>
      )}

      {(state.soort === "NUMMER" || state.soort === "AANTAL" || state.soort === "OPPERVLAKTE" || state.soort === "SLIDER") && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="veld-min">Minimum</Label>
            <DecimalInput id="veld-min" value={state.min} onChange={(e) => commit({ min: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="veld-max">Maximum</Label>
            <DecimalInput id="veld-max" value={state.max} onChange={(e) => commit({ max: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="veld-stap">Stapgrootte</Label>
            <DecimalInput id="veld-stap" value={state.stap} onChange={(e) => commit({ stap: e.target.value })} />
          </div>
        </div>
      )}

      {state.soort === "AFMETINGEN" && (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <span className="text-sm font-medium text-foreground">Ook hoogte vragen (voor m³)</span>
          <Switch checked={state.metHoogte} onChange={(e) => commit({ metHoogte: e.target.checked })} />
        </label>
      )}

      {isKeuzeSoort && <KeuzeOptiesEditor opties={state.opties} onChange={(opties) => commit({ opties })} />}

      {state.soort === "PRODUCT_KEUZE" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          {productKeuzeFout && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{productKeuzeFout}</p>}
          <ProductOptiesEditor opties={productOpties} onChange={handleProductOptiesChange} />
          {isNieuwProductKeuze && (
            <Button type="button" size="sm" className="w-fit" onClick={handleProductKeuzeAanmaken} disabled={productKeuzeBezig}>
              {productKeuzeBezig ? "Bezig…" : "Materiaal-/productkeuze aanmaken"}
            </Button>
          )}
        </div>
      )}

      <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">Verplicht</span>
        <Switch checked={state.verplicht} onChange={(e) => commit({ verplicht: e.target.checked })} />
      </label>

      {conditieVariabelen.length > 0 && (
        <AdvancedSettings>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Alleen tonen onder een voorwaarde</span>
              <Switch
                checked={state.heeftZichtbaarAls}
                onChange={(e) =>
                  commit({
                    heeftZichtbaarAls: e.target.checked,
                    zichtbaarAlsGroep: state.zichtbaarAlsGroep.condities.length > 0 ? state.zichtbaarAlsGroep : { combinator: "EN", condities: [legeConditie(conditieVariabelen)] },
                  })
                }
              />
            </label>
            {state.heeftZichtbaarAls && <VoorwaardeEditor groep={state.zichtbaarAlsGroep} onChange={(zichtbaarAlsGroep) => commit({ zichtbaarAlsGroep })} variabelen={conditieVariabelen} />}
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Ook verplicht onder een voorwaarde</span>
              <Switch
                checked={state.heeftVerplichtAls}
                onChange={(e) =>
                  commit({
                    heeftVerplichtAls: e.target.checked,
                    verplichtAlsGroep: state.verplichtAlsGroep.condities.length > 0 ? state.verplichtAlsGroep : { combinator: "EN", condities: [legeConditie(conditieVariabelen)] },
                  })
                }
              />
            </label>
            {state.heeftVerplichtAls && <VoorwaardeEditor groep={state.verplichtAlsGroep} onChange={(verplichtAlsGroep) => commit({ verplichtAlsGroep })} variabelen={conditieVariabelen} />}
          </div>
        </AdvancedSettings>
      )}
    </div>
  );
}
