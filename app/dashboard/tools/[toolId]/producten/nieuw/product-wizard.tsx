"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { KostenUitsplitsing } from "../velden/kosten-blok";
import type { PricingSettings } from "../product-form";
import {
  createProductFromPresetAction,
  saveWizardMaterialsAction,
  updateProductDraftAction,
  type PresetWizardMateriaal,
} from "@/app/lib/actions/products";
import { saveBasisTarievenAction, type BasisTarievenState } from "@/app/lib/actions/cost-settings";
import { arbeidTariefVoorStapEenheid, type MateriaalRegel } from "@/app/lib/calculate";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";
import { parseGetal } from "@/app/lib/sjablonen";
import { unitLabel } from "@/app/lib/units";
import { BasisTarievenVelden } from "@/app/components/dashboard/basis-tarieven-velden";
import {
  EIGEN_WERKZAAMHEID,
  HOVENIER_PRESETS,
  VOORBEELD_LABEL,
  presetNaarProductFormData,
  productiviteitVoorStapEenheid,
  productiviteitVraagVoor,
  type HovenierPreset,
} from "@/app/lib/presets";
import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

export type WizardPricingSettings = PricingSettings;
export type WizardBasisStatus = { nogInstellen: boolean; eenheidVergrendeld: boolean };

const STAPPEN = [
  { nummer: 1, titel: "Werkzaamheid" },
  { nummer: 2, titel: "Materialen" },
  { nummer: 3, titel: "Productiviteit" },
] as const;

type MateriaalRij = { sleutel: string; id?: string; naam: string; prijs: string };

let rijTeller = 0;
const nieuweSleutel = () => `rij-${++rijTeller}`;

function naarRijen(materialen: PresetWizardMateriaal[]): MateriaalRij[] {
  return materialen.map((m) => ({ sleutel: nieuweSleutel(), id: m.id, naam: m.naam, prijs: String(m.prijs) }));
}

// Wizard in 3 stappen: werkzaamheid kiezen → materialen & prijzen →
// productiviteit met live rekenvoorbeeld. Elke stap slaat meteen op, dus er
// gaat nooit werk verloren. Uurtarief/voorrij/transport komen uit de
// algemene kosteninstellingen (zie BasisTarievenKaart voor de eenmalige vraag).
export function ProductWizard({
  toolId,
  pricingSettings,
  basisStatus,
}: {
  toolId: string;
  pricingSettings: WizardPricingSettings;
  basisStatus: WizardBasisStatus;
}) {
  const [stap, setStap] = useState(1);
  const [klaar, setKlaar] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [gekozen, setGekozen] = useState<HovenierPreset | null>(null);
  const [eigenNaam, setEigenNaam] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [rijen, setRijen] = useState<MateriaalRij[]>([]);

  const [settings, setSettings] = useState(pricingSettings);
  const [basisNogNodig, setBasisNogNodig] = useState(basisStatus.nogInstellen);
  const stapEenheid = settings.arbeidStapEenheid;

  const [productiviteit, setProductiviteit] = useState("");
  const [voorbeeldHoeveelheid, setVoorbeeldHoeveelheid] = useState("20");
  const [voorbeeldMateriaal, setVoorbeeldMateriaal] = useState(0);

  const naam = gekozen?.id === "eigen" ? eigenNaam.trim() : gekozen?.naam ?? "";
  const eenheid = gekozen?.eenheid ?? "m2";

  function kies(preset: HovenierPreset) {
    setGekozen(preset);
    setError(undefined);
  }

  function volgendeVanuitStap1() {
    if (!gekozen) {
      setError("Kies eerst een werkzaamheid.");
      return;
    }
    if (gekozen.id === "eigen" && eigenNaam.trim() === "") {
      setError("Geef je werkzaamheid een naam.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createProductFromPresetAction(toolId, gekozen.id, eigenNaam);
      if (result?.error || !result?.productId) {
        setError(result?.error ?? "Aanmaken is niet gelukt. Probeer het opnieuw.");
        return;
      }
      setProductId(result.productId);
      setRijen(naarRijen(result.materialen ?? []));
      setProductiviteit(String(productiviteitVoorStapEenheid(gekozen, stapEenheid) || ""));
      setVoorbeeldHoeveelheid(String(gekozen.voorbeeldHoeveelheid));
      setStap(2);
    });
  }

  function volgendeVanuitStap2() {
    if (!productId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await saveWizardMaterialsAction(
        productId,
        rijen.map((r) => ({ id: r.id, naam: r.naam, prijs: r.prijs }))
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRijen(naarRijen(result?.materialen ?? []));
      setVoorbeeldMateriaal(0);
      setStap(3);
    });
  }

  function opslaanEnKlaar() {
    if (!productId || !gekozen) return;
    setError(undefined);
    const getal = parseGetal(productiviteit, 0);
    const fd = presetNaarProductFormData(gekozen, stapEenheid, {
      naam,
      productiviteit: getal > 0 ? getal : null,
    });
    startTransition(async () => {
      const result = await updateProductDraftAction(productId, null, fd);
      const foutmelding = result?.error ?? (result?.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined);
      if (foutmelding) {
        setError(foutmelding);
        return;
      }
      setKlaar(true);
    });
  }

  function opnieuw() {
    setStap(1);
    setKlaar(false);
    setGekozen(null);
    setEigenNaam("");
    setProductId(null);
    setRijen([]);
    setError(undefined);
  }

  // Live rekenvoorbeeld — dezelfde berekening als de echte klantprijs
  // (KostenUitsplitsing → berekenProductKosten), met de gekozen
  // voorbeeldhoeveelheid en het eerste (of gekozen) materiaal.
  const hoeveelheid = parseGetal(voorbeeldHoeveelheid, 0);
  const rij = rijen[Math.min(voorbeeldMateriaal, rijen.length - 1)];
  const prijsGetal = rij ? parseGetal(rij.prijs, 0) : 0;
  const materiaalRegels: MateriaalRegel[] = [
    {
      categorieId: "primair",
      categorieNaam: "Materiaal",
      optieId: rij?.id ?? "",
      optieNaam: rij?.naam ?? "Materiaal",
      hoeveelheid,
      prijsPerEenheid: prijsGetal,
      bedrag: hoeveelheid * prijsGetal,
    },
  ];
  const productiviteitGetal = parseGetal(productiviteit, 0);

  return (
    <div className="flex flex-col gap-6">
      {!klaar && <StapIndicator huidigeStap={stap} />}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}

      {!klaar && stap === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Wat voor werk wil je laten berekenen?</h2>
            <p className="text-sm text-muted-foreground">
              Kies een werkzaamheid. Prijzen en snelheid pas je in de volgende stappen aan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {[...HOVENIER_PRESETS, EIGEN_WERKZAAMHEID].map((preset) => (
              <PresetKaart
                key={preset.id}
                preset={preset}
                geselecteerd={gekozen?.id === preset.id}
                onKies={() => kies(preset)}
              />
            ))}
          </div>
          {gekozen?.id === "eigen" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wizard-eigen-naam">Naam van de werkzaamheid</Label>
              <Input
                id="wizard-eigen-naam"
                placeholder="Bijv. Tuinverlichting"
                value={eigenNaam}
                onChange={(e) => setEigenNaam(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={volgendeVanuitStap1} disabled={pending || !gekozen} className="w-full sm:w-auto">
              {pending ? "Even geduld…" : "Volgende"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {!klaar && stap === 2 && gekozen && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Materialen & prijzen</h2>
            <p className="text-sm text-muted-foreground">
              Wat vraag je per {unitLabel(eenheid)}? Pas de prijzen aan, haal materialen weg of voeg er een toe.
            </p>
            {gekozen.id !== "eigen" && <VoorbeeldLabel />}
          </div>
          <div className="flex flex-col gap-3">
            {rijen.map((r) => (
              <div key={r.sleutel} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`naam-${r.sleutel}`}>Materiaal</Label>
                  <Input
                    id={`naam-${r.sleutel}`}
                    value={r.naam}
                    onChange={(e) =>
                      setRijen((prev) => prev.map((x) => (x.sleutel === r.sleutel ? { ...x, naam: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-40 sm:flex-none">
                    <Label htmlFor={`prijs-${r.sleutel}`}>Prijs per {unitLabel(eenheid)}</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        €
                      </span>
                      <DecimalInput
                        id={`prijs-${r.sleutel}`}
                        value={r.prijs}
                        onChange={(e) =>
                          setRijen((prev) => prev.map((x) => (x.sleutel === r.sleutel ? { ...x, prijs: e.target.value } : x)))
                        }
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`${r.naam || "Materiaal"} verwijderen`}
                    onClick={() => setRijen((prev) => prev.filter((x) => x.sleutel !== r.sleutel))}
                    className="h-11 w-11 shrink-0 px-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setRijen((prev) => [...prev, { sleutel: nieuweSleutel(), naam: "", prijs: "0" }])}
              className="w-full sm:w-fit"
            >
              <Plus className="h-4 w-4" />
              Materiaal toevoegen
            </Button>
          </div>
          <WizardNavigatie
            pending={pending}
            onVolgende={volgendeVanuitStap2}
            onOverslaan={() => {
              setError(undefined);
              setStap(3);
            }}
          />
        </div>
      )}

      {!klaar && stap === 3 && gekozen && (
        <div className="flex flex-col gap-5">
          {basisNogNodig ? (
            <BasisTarievenKaart
              toolId={toolId}
              eenheidVergrendeld={basisStatus.eenheidVergrendeld}
              huidigeEenheid={stapEenheid}
              onOpgeslagen={(o) => {
                setSettings((s) => ({ ...s, ...o }));
                setProductiviteit(String(productiviteitVoorStapEenheid(gekozen, o.arbeidStapEenheid) || ""));
                setBasisNogNodig(false);
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-semibold text-foreground">Hoe snel werk je?</h2>
                <Label htmlFor="wizard-productiviteit">{productiviteitVraagVoor(gekozen, stapEenheid)}</Label>
                <DecimalInput
                  id="wizard-productiviteit"
                  placeholder="Bijv. 20"
                  value={productiviteit}
                  onChange={(e) => setProductiviteit(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Laat leeg als dit werk geen arbeidstijd kost. Je rekent per {arbeidEenheidEnkelvoud(stapEenheid)}; dat
                  kun je wijzigen bij Prijzen.
                </p>
                {gekozen.id !== "eigen" && <VoorbeeldLabel />}
              </div>

              <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:p-4">
                <p className="text-sm font-medium text-foreground">Zo ziet een klantprijs eruit</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wizard-voorbeeld-hoeveelheid">Klant vult in ({unitLabel(eenheid)})</Label>
                    <DecimalInput
                      id="wizard-voorbeeld-hoeveelheid"
                      value={voorbeeldHoeveelheid}
                      onChange={(e) => setVoorbeeldHoeveelheid(e.target.value)}
                    />
                  </div>
                  {rijen.length > 1 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="wizard-voorbeeld-materiaal">Klant kiest</Label>
                      <Select
                        id="wizard-voorbeeld-materiaal"
                        value={String(Math.min(voorbeeldMateriaal, rijen.length - 1))}
                        onChange={(e) => setVoorbeeldMateriaal(Number(e.target.value))}
                      >
                        {rijen.map((r, i) => (
                          <option key={r.sleutel} value={i}>
                            {r.naam}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
                <KostenUitsplitsing
                  naam={naam}
                  hoeveelheid={hoeveelheid}
                  eenheid={eenheid}
                  materiaalRegels={materiaalRegels}
                  materiaalEnabled={settings.materiaalEnabled}
                  productiviteit={productiviteitGetal > 0 ? productiviteitGetal : null}
                  arbeidTarief={arbeidTariefVoorStapEenheid(settings, stapEenheid)}
                  arbeidEnabled={settings.arbeidEnabled}
                  arbeidAfronden={settings.arbeidAfronden}
                  transportBedrag={settings.transportTarief}
                  transportMeeschalend={false}
                  transportEnabled={settings.transportEnabled}
                  voorrijBedrag={settings.voorrijTarief}
                  voorrijMeeschalend={false}
                  voorrijEnabled={settings.voorrijEnabled}
                />
              </div>

              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStap(2)} disabled={pending}>
                  <ArrowLeft className="h-4 w-4" />
                  Terug
                </Button>
                <Button type="button" onClick={opslaanEnKlaar} disabled={pending}>
                  {pending ? "Even geduld…" : "Opslaan en klaar"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {klaar && productId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{naam} staat klaar</p>
              <p className="text-sm text-muted-foreground">Klanten kunnen dit nu kiezen in je rekentool.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" onClick={opnieuw} className="w-full sm:w-auto">
              Nog een werkzaamheid
            </Button>
            <LinkButton href={`/dashboard/tools/${toolId}/producten`} variant="outline" className="w-full sm:w-auto">
              Naar mijn werkzaamheden
            </LinkButton>
            <LinkButton
              href={`/dashboard/tools/${toolId}/producten/${productId}/bewerken`}
              className="w-full sm:w-auto"
            >
              Verder aanpassen
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}

function VoorbeeldLabel() {
  return (
    <p className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
      {VOORBEELD_LABEL}
    </p>
  );
}

function PresetKaart({
  preset,
  geselecteerd,
  onKies,
}: {
  preset: HovenierPreset;
  geselecteerd: boolean;
  onKies: () => void;
}) {
  const Icon = PRODUCT_ICONS[preset.icoon];
  return (
    <button
      type="button"
      onClick={onKies}
      aria-pressed={geselecteerd}
      className={cn(
        "flex min-w-0 flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        geselecteerd ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {Icon && <Icon className="h-5 w-5" />}
      </span>
      <span className="break-words text-sm font-medium leading-tight text-foreground">{preset.naam}</span>
      <span className="break-words text-xs text-muted-foreground">{preset.uitleg}</span>
    </button>
  );
}

function WizardNavigatie({
  pending,
  onVolgende,
  onOverslaan,
}: {
  pending: boolean;
  onVolgende: () => void;
  onOverslaan: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onOverslaan} disabled={pending}>
        Overslaan
      </Button>
      <Button type="button" onClick={onVolgende} disabled={pending}>
        {pending ? "Even geduld…" : "Volgende"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// Eenmalige vraag: hoe reken je arbeid, en wat zijn je vaste tarieven. Alleen
// zichtbaar zolang de kosteninstellingen nog op de standaardwaarden staan.
function BasisTarievenKaart({
  toolId,
  eenheidVergrendeld,
  huidigeEenheid,
  onOpgeslagen,
}: {
  toolId: string;
  eenheidVergrendeld: boolean;
  huidigeEenheid: ArbeidStapEenheid;
  onOpgeslagen: (o: NonNullable<NonNullable<BasisTarievenState>["opgeslagen"]>) => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveBasisTarievenAction(toolId, null, fd);
      if (result?.opgeslagen) onOpgeslagen(result.opgeslagen);
      else setError(result?.error ?? "Opslaan is niet gelukt.");
    });
  }

  return (
    <form onSubmit={opslaan} className="flex flex-col gap-4 rounded-md border border-primary/30 bg-primary/5 p-3 sm:p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Eerst even je vaste tarieven</h2>
        <p className="text-sm text-muted-foreground">
          Dit vraag ik één keer. Het geldt voor al je werkzaamheden en je kunt het altijd wijzigen bij Prijzen.
        </p>
        <VoorbeeldLabel />
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <BasisTarievenVelden
        start={{ arbeidStapEenheid: huidigeEenheid }}
        eenheidVergrendeld={eenheidVergrendeld}
      />
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Opslaan…" : "Opslaan en verder"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}

function StapIndicator({ huidigeStap }: { huidigeStap: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {STAPPEN.map((s) => (
        <li key={s.nummer} className="flex min-w-0 flex-col gap-1" aria-current={s.nummer === huidigeStap ? "step" : undefined}>
          <div className={s.nummer <= huidigeStap ? "h-1.5 rounded-full bg-primary" : "h-1.5 rounded-full bg-border"} />
          <p
            className={cn(
              "break-words text-xs leading-tight",
              s.nummer === huidigeStap ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {s.nummer}. {s.titel}
          </p>
        </li>
      ))}
    </ol>
  );
}
