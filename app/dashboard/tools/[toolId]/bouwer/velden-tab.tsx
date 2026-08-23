"use client";

import { useState } from "react";
import { Copy, HelpCircle, Plus, Trash2 } from "lucide-react";
import type { CalculatorField, DerivedVariable, Expression, KeuzeOptie } from "@/app/lib/calculator-engine";
import { upsertProductKeuzeOptiesAction, type ProductKeuzeOptieInvoer } from "@/app/lib/actions/calculator-config";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Overlay } from "@/app/components/ui/overlay";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { SortableList } from "@/app/components/ui/sortable-list";
import { genereerId } from "./id-utils";
import { beschikbareVariabelen } from "./variabelen-utils";
import { VoorwaardeEditor, ontleedVoorwaarde, bouwVoorwaarde, legeConditie, type VoorwaardeGroep } from "./voorwaarde-editor";
import { BuilderListRow } from "./builder-list-row";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";

const SOORT_LABELS: Record<CalculatorField["soort"], string> = {
  NUMMER: "Getal",
  AANTAL: "Aantal",
  OPPERVLAKTE: "Oppervlakte (handmatig)",
  SLIDER: "Schuifbalk",
  TEKST: "Tekst",
  JA_NEE: "Ja / nee",
  CHECKBOX: "Aanvinkvakje",
  DROPDOWN: "Keuzelijst",
  RADIO: "Keuzerondjes",
  MEERKEUZE: "Meerdere keuzes",
  AFMETINGEN: "Afmetingen (lengte × breedte)",
  PRODUCT_KEUZE: "Materiaal-/productkeuze",
};

const SOORT_UITLEG: Record<CalculatorField["soort"], string> = {
  NUMMER: "De klant vult een getal in, bijv. het aantal meters.",
  AANTAL: "Hetzelfde als een getal, maar met 'aantal' als standaardlabel.",
  OPPERVLAKTE: "De klant vult direct een oppervlakte in (m²).",
  SLIDER: "De klant sleept een schuifbalk naar de gewenste waarde.",
  TEKST: "Vrije tekst, bijv. een opmerking of adres.",
  JA_NEE: "Een aan/uit-schakelaar, bijv. 'oude schutting verwijderen?'.",
  CHECKBOX: "Een vinkje, bijv. voor een optionele extra.",
  DROPDOWN: "De klant kiest één optie uit een lijst.",
  RADIO: "De klant kiest één optie uit zichtbare rondjes.",
  MEERKEUZE: "De klant kan meerdere opties tegelijk aanvinken.",
  AFMETINGEN: "Lengte × breedte (en optioneel hoogte) — oppervlakte wordt automatisch berekend.",
  PRODUCT_KEUZE: "De klant kiest een materiaal of product, elk met een eigen prijs.",
};

// Compacte meta-regel per vraag (Deel 7: "Getal · m² · Verplicht") i.p.v.
// alleen het type — toont in één oogopslag ook eenheid en verplicht-status.
function veldMeta(veld: CalculatorField): string {
  const delen = [SOORT_LABELS[veld.soort]];
  if ("eenheid" in veld && veld.eenheid) delen.push(veld.eenheid);
  if ("opties" in veld) delen.push(`${veld.opties.length} ${veld.opties.length === 1 ? "optie" : "opties"}`);
  if (veld.verplicht) delen.push("Verplicht");
  return delen.join(" · ");
}

export function VeldenTab({
  toolId,
  velden,
  onChange,
  materiaalOpties,
  onMateriaalOptiesChange,
  afgeleideVariabelen = [],
}: {
  toolId: string;
  velden: CalculatorField[];
  onChange: (velden: CalculatorField[]) => void;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  onMateriaalOptiesChange: (materiaalOpties: Record<string, MateriaalOptie[]>) => void;
  afgeleideVariabelen?: DerivedVariable[];
}) {
  const [bewerkVeld, setBewerkVeld] = useState<CalculatorField | "nieuw" | null>(null);
  const [verwijderVeld, setVerwijderVeld] = useState<CalculatorField | null>(null);

  function opslaan(veld: CalculatorField) {
    const bestaatAl = velden.some((v) => v.id === veld.id);
    onChange(bestaatAl ? velden.map((v) => (v.id === veld.id ? veld : v)) : [...velden, veld]);
    setBewerkVeld(null);
  }

  function verwijder(veld: CalculatorField) {
    onChange(velden.filter((v) => v.id !== veld.id));
    setVerwijderVeld(null);
  }

  // Client-side kloon (geen server-actie nodig, in tegenstelling tot
  // Onderdelen dupliceren): veilig voor elk veldtype behalve PRODUCT_KEUZE,
  // dat naar een echte database-rij (materialCategoryId) verwijst — twee
  // velden die er hetzelfde id voor delen zouden elkaars materiaalopties
  // overschrijven. Voor dat type wordt "Dupliceren" daarom niet getoond.
  function dupliceerVeld(veld: CalculatorField) {
    const nieuweId = genereerId(`${veld.label} kopie`, new Set(velden.map((v) => v.id)));
    onChange([...velden, { ...veld, id: nieuweId, label: `${veld.label} (kopie)` }]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vragen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Wat wil je van je klant weten?</p>
        </div>
        <Button type="button" onClick={() => setBewerkVeld("nieuw")}>
          <Plus className="h-4 w-4" />
          Vraag toevoegen
        </Button>
      </div>

      {velden.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Nog geen vragen</p>
              <p className="mt-1 text-sm text-muted-foreground">Voeg je eerste vraag toe om te beginnen.</p>
            </div>
            <Button type="button" size="sm" onClick={() => setBewerkVeld("nieuw")}>
              <Plus className="h-4 w-4" />
              Vraag toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SortableList
          dndContextId="velden-lijst"
          items={velden}
          onReorder={onChange}
          renderItem={(veld, dragHandleProps) => (
            <BuilderListRow
              dragHandleProps={dragHandleProps}
              title={veld.label}
              meta={veldMeta(veld)}
              onEdit={() => setBewerkVeld(veld)}
              menuItems={[
                ...(veld.soort === "PRODUCT_KEUZE"
                  ? []
                  : [{ label: "Dupliceren", icon: Copy, onSelect: () => dupliceerVeld(veld) }]),
                { label: "Verwijderen", icon: Trash2, onSelect: () => setVerwijderVeld(veld), destructive: true },
              ]}
            />
          )}
        />
      )}

      {bewerkVeld && (
        <VeldFormModal
          toolId={toolId}
          veld={bewerkVeld === "nieuw" ? null : bewerkVeld}
          bestaandeIds={new Set(velden.map((v) => v.id).filter((id) => bewerkVeld === "nieuw" || id !== (bewerkVeld as CalculatorField).id))}
          overigeVelden={velden.filter((v) => bewerkVeld === "nieuw" || v.id !== (bewerkVeld as CalculatorField).id)}
          afgeleideVariabelen={afgeleideVariabelen}
          materiaalOpties={materiaalOpties}
          onMateriaalOptiesChange={onMateriaalOptiesChange}
          onClose={() => setBewerkVeld(null)}
          onSave={opslaan}
        />
      )}

      <ConfirmDialog
        open={verwijderVeld != null}
        onClose={() => setVerwijderVeld(null)}
        onConfirm={() => verwijderVeld && verwijder(verwijderVeld)}
        title={`"${verwijderVeld?.label}" verwijderen?`}
        description="Prijsregels die naar deze vraag verwijzen werken hierna niet meer — je krijgt daar een melding van."
      />
    </div>
  );
}

function VeldFormModal({
  toolId,
  veld,
  bestaandeIds,
  overigeVelden,
  afgeleideVariabelen,
  materiaalOpties,
  onMateriaalOptiesChange,
  onClose,
  onSave,
}: {
  toolId: string;
  veld: CalculatorField | null;
  bestaandeIds: Set<string>;
  overigeVelden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  materiaalOpties: Record<string, MateriaalOptie[]>;
  onMateriaalOptiesChange: (materiaalOpties: Record<string, MateriaalOptie[]>) => void;
  onClose: () => void;
  onSave: (veld: CalculatorField) => void;
}) {
  const [soort, setSoort] = useState<CalculatorField["soort"]>(veld?.soort ?? "NUMMER");
  const [label, setLabel] = useState(veld?.label ?? "");
  const [helpTekst, setHelpTekst] = useState(veld?.helpTekst ?? "");
  const [verplicht, setVerplicht] = useState(veld?.verplicht ?? true);
  const conditieVariabelen = beschikbareVariabelen(overigeVelden, afgeleideVariabelen);
  const bestaandeZichtbaarAls = ontleedVoorwaarde(veld?.zichtbaarAls);
  const [heeftZichtbaarAls, setHeeftZichtbaarAls] = useState(bestaandeZichtbaarAls != null);
  const [zichtbaarAlsGroep, setZichtbaarAlsGroep] = useState<VoorwaardeGroep>(
    bestaandeZichtbaarAls ?? { combinator: "EN", condities: [legeConditie(conditieVariabelen)] }
  );
  const bestaandeVerplichtAls = ontleedVoorwaarde(veld?.verplichtAls);
  const [heeftVerplichtAls, setHeeftVerplichtAls] = useState(bestaandeVerplichtAls != null);
  const [verplichtAlsGroep, setVerplichtAlsGroep] = useState<VoorwaardeGroep>(
    bestaandeVerplichtAls ?? { combinator: "EN", condities: [legeConditie(conditieVariabelen)] }
  );
  const [eenheid, setEenheid] = useState("eenheid" in (veld ?? {}) ? ((veld as { eenheid?: string })?.eenheid ?? "") : "");
  const [min, setMin] = useState<string>("min" in (veld ?? {}) ? String((veld as { min?: number })?.min ?? "") : "");
  const [max, setMax] = useState<string>("max" in (veld ?? {}) ? String((veld as { max?: number })?.max ?? "") : "");
  const [stap, setStap] = useState<string>("stap" in (veld ?? {}) ? String((veld as { stap?: number })?.stap ?? "") : "");
  const [metHoogte, setMetHoogte] = useState(veld?.soort === "AFMETINGEN" ? veld.metHoogte : false);
  const [opties, setOpties] = useState<KeuzeOptie[]>(veld && "opties" in veld ? veld.opties : []);
  const materialCategoryId = veld?.soort === "PRODUCT_KEUZE" ? veld.materialCategoryId : null;
  const [productOpties, setProductOpties] = useState<ProductKeuzeOptieInvoer[]>(
    veld?.soort === "PRODUCT_KEUZE" ? (materiaalOpties[veld.materialCategoryId] ?? []) : []
  );
  const [opslaanFout, setOpslaanFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function handleOpslaan() {
    if (!label.trim()) {
      setOpslaanFout("Vul een vraag/label in.");
      return;
    }
    setBezig(true);
    setOpslaanFout(null);

    const id = veld?.id ?? genereerId(label, bestaandeIds);
    const zichtbaarAls: Expression | undefined = heeftZichtbaarAls ? bouwVoorwaarde(zichtbaarAlsGroep, conditieVariabelen) : undefined;
    const verplichtAls: Expression | undefined = heeftVerplichtAls ? bouwVoorwaarde(verplichtAlsGroep, conditieVariabelen) : undefined;
    const basis = { id, label: label.trim(), helpTekst: helpTekst.trim() || undefined, verplicht, zichtbaarAls, verplichtAls };

    if (soort === "PRODUCT_KEUZE") {
      const geldigeOpties = productOpties.filter((o) => o.naam.trim().length > 0);
      if (geldigeOpties.length === 0) {
        setOpslaanFout("Voeg minimaal één materiaal-/productoptie toe.");
        setBezig(false);
        return;
      }
      const result = await upsertProductKeuzeOptiesAction(toolId, materialCategoryId, label.trim(), geldigeOpties);
      if ("error" in result) {
        setOpslaanFout(result.error);
        setBezig(false);
        return;
      }
      onMateriaalOptiesChange({
        ...materiaalOpties,
        [result.materialCategoryId]: geldigeOpties.map((o, i) => ({
          id: o.id ?? `nieuw-${i}-${Date.now()}`,
          naam: o.naam,
          prijs: o.prijs,
        })),
      });
      onSave({ ...basis, soort: "PRODUCT_KEUZE", materialCategoryId: result.materialCategoryId });
      return;
    }

    switch (soort) {
      case "NUMMER":
      case "AANTAL":
      case "OPPERVLAKTE":
        onSave({
          ...basis,
          soort,
          eenheid: eenheid.trim() || undefined,
          min: min !== "" ? Number(min) : undefined,
          max: max !== "" ? Number(max) : undefined,
          stap: stap !== "" ? Number(stap) : undefined,
        });
        return;
      case "SLIDER":
        onSave({
          ...basis,
          soort: "SLIDER",
          eenheid: eenheid.trim() || undefined,
          min: min !== "" ? Number(min) : 0,
          max: max !== "" ? Number(max) : 100,
          stap: stap !== "" ? Number(stap) : 1,
        });
        return;
      case "TEKST":
        onSave({ ...basis, soort: "TEKST" });
        return;
      case "JA_NEE":
      case "CHECKBOX":
        onSave({ ...basis, soort });
        return;
      case "DROPDOWN":
      case "RADIO":
        if (opties.length === 0) {
          setOpslaanFout("Voeg minimaal één keuze-optie toe.");
          setBezig(false);
          return;
        }
        onSave({ ...basis, soort, opties });
        return;
      case "MEERKEUZE":
        if (opties.length === 0) {
          setOpslaanFout("Voeg minimaal één keuze-optie toe.");
          setBezig(false);
          return;
        }
        onSave({ ...basis, soort: "MEERKEUZE", opties });
        return;
      case "AFMETINGEN":
        onSave({ ...basis, soort: "AFMETINGEN", eenheid: eenheid.trim() || "meter", metHoogte });
        return;
    }
  }

  const isKeuzeSoort = soort === "DROPDOWN" || soort === "RADIO" || soort === "MEERKEUZE";

  return (
    <Overlay open onClose={onClose} ariaLabel="Vraag bewerken" className="flex items-center justify-center p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">{veld ? "Vraag bewerken" : "Vraag toevoegen"}</h3>

        {opslaanFout && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{opslaanFout}</p>}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veld-soort">Type vraag</Label>
          <Select
            id="veld-soort"
            value={soort}
            onChange={(e) => setSoort(e.target.value as CalculatorField["soort"])}
            disabled={veld != null}
          >
            {Object.entries(SOORT_LABELS).map(([waarde, tekst]) => (
              <option key={waarde} value={waarde}>
                {tekst}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{SOORT_UITLEG[soort]}</p>
          {veld && <p className="text-xs text-muted-foreground">Het type wijzigen kan niet — verwijder de vraag en maak &apos;m opnieuw aan.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veld-label">Wat wil je weten?</Label>
          <Input id="veld-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bijv. Hoeveel meter schutting?" autoFocus />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veld-help">Toelichting (optioneel)</Label>
          <Input id="veld-help" value={helpTekst} onChange={(e) => setHelpTekst(e.target.value)} placeholder="Extra uitleg voor je klant" />
        </div>

        {(soort === "NUMMER" || soort === "AANTAL" || soort === "OPPERVLAKTE" || soort === "SLIDER" || soort === "AFMETINGEN") && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="veld-eenheid">Eenheid</Label>
            <Input id="veld-eenheid" value={eenheid} onChange={(e) => setEenheid(e.target.value)} placeholder="Bijv. meter, m², stuks" />
          </div>
        )}

        {(soort === "NUMMER" || soort === "AANTAL" || soort === "OPPERVLAKTE" || soort === "SLIDER") && (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veld-min">Minimum</Label>
              <DecimalInput id="veld-min" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veld-max">Maximum</Label>
              <DecimalInput id="veld-max" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veld-stap">Stapgrootte</Label>
              <DecimalInput id="veld-stap" value={stap} onChange={(e) => setStap(e.target.value)} />
            </div>
          </div>
        )}

        {soort === "AFMETINGEN" && (
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">Ook hoogte vragen (voor m³)</span>
            <Switch checked={metHoogte} onChange={(e) => setMetHoogte(e.target.checked)} />
          </label>
        )}

        {isKeuzeSoort && <KeuzeOptiesEditor opties={opties} onChange={setOpties} />}

        {soort === "PRODUCT_KEUZE" && <ProductOptiesEditor opties={productOpties} onChange={setProductOpties} />}

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <span className="text-sm font-medium text-foreground">Verplicht</span>
          <Switch checked={verplicht} onChange={(e) => setVerplicht(e.target.checked)} />
        </label>

        {conditieVariabelen.length > 0 && (
          <>
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Alleen tonen onder een voorwaarde</span>
                <Switch checked={heeftZichtbaarAls} onChange={(e) => setHeeftZichtbaarAls(e.target.checked)} />
              </label>
              {heeftZichtbaarAls && <VoorwaardeEditor groep={zichtbaarAlsGroep} onChange={setZichtbaarAlsGroep} variabelen={conditieVariabelen} />}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Ook verplicht onder een voorwaarde</span>
                <Switch checked={heeftVerplichtAls} onChange={(e) => setHeeftVerplichtAls(e.target.checked)} />
              </label>
              {heeftVerplichtAls && <VoorwaardeEditor groep={verplichtAlsGroep} onChange={setVerplichtAlsGroep} variabelen={conditieVariabelen} />}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="button" onClick={handleOpslaan} disabled={bezig}>
            {bezig ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function KeuzeOptiesEditor({ opties, onChange }: { opties: KeuzeOptie[]; onChange: (opties: KeuzeOptie[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Keuze-opties</Label>
      {opties.map((optie, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={optie.label}
            onChange={(e) => {
              const label = e.target.value;
              const nieuw = [...opties];
              nieuw[i] = { waarde: label.toLowerCase().replace(/\s+/g, "-"), label };
              onChange(nieuw);
            }}
            placeholder={`Optie ${i + 1}`}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(opties.filter((_, j) => j !== i))} aria-label="Verwijderen">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => onChange([...opties, { waarde: "", label: "" }])}>
        <Plus className="h-3.5 w-3.5" />
        Optie toevoegen
      </Button>
    </div>
  );
}

function ProductOptiesEditor({
  opties,
  onChange,
}: {
  opties: ProductKeuzeOptieInvoer[];
  onChange: (opties: ProductKeuzeOptieInvoer[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Materiaal-/productopties, elk met een eigen prijs</Label>
      {opties.map((optie, i) => (
        <div key={optie.id ?? i} className="flex gap-2">
          <Input
            value={optie.naam}
            onChange={(e) => {
              const nieuw = [...opties];
              nieuw[i] = { ...optie, naam: e.target.value };
              onChange(nieuw);
            }}
            placeholder="Bijv. Douglas"
            className="flex-1"
          />
          <div className="relative w-32 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            <DecimalInput
              value={optie.prijs === 0 ? "" : String(optie.prijs)}
              onChange={(e) => {
                const nieuw = [...opties];
                nieuw[i] = { ...optie, prijs: Number(e.target.value.replace(",", ".")) || 0 };
                onChange(nieuw);
              }}
              className="pl-7"
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(opties.filter((_, j) => j !== i))} aria-label="Verwijderen">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => onChange([...opties, { naam: "", prijs: 0 }])}>
        <Plus className="h-3.5 w-3.5" />
        Optie toevoegen
      </Button>
    </div>
  );
}
