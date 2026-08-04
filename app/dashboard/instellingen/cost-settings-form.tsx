"use client";

import { useActionState, useState } from "react";
import {
  updateCostSettingsAction,
  type CostSettingsFormState,
} from "@/app/lib/actions/cost-settings";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DecimalInput, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { HelpTip } from "@/app/components/ui/help-tip";
import { cn } from "@/app/lib/cn";
import { Eye } from "lucide-react";
import { arbeidEenheidMeervoud } from "@/app/lib/arbeid";
import type { HelpContentKey } from "@/app/lib/helpContent";
import type { ArbeidStapEenheid, BandbreedteModus, CostSettings } from "@/app/generated/prisma/client";

// Aantal producten dat een eigen override heeft voor een kostenpost — laat
// vooraf zien hoeveel producten een wijziging hier raakt (die zónder eigen
// override) vóórdat de vakman opslaat.
export type ProductCounts = {
  totaal: number;
  arbeidOverrides: number;
  transportOverrides: number;
  voorrijOverrides: number;
};

export function CostSettingsForm({
  costSettings,
  productCounts,
}: {
  costSettings: CostSettings;
  productCounts: ProductCounts;
}) {
  const [state, formAction, pending] = useActionState<
    CostSettingsFormState,
    FormData
  >(updateCostSettingsAction, null);

  const [arbeidOn, setArbeidOn] = useState(costSettings.arbeidEnabled);
  const [arbeidStapEenheid, setArbeidStapEenheid] = useState<ArbeidStapEenheid>(
    costSettings.arbeidStapEenheid
  );
  const [transportOn, setTransportOn] = useState(costSettings.transportEnabled);
  const [voorrijOn, setVoorrijOn] = useState(costSettings.voorrijEnabled);
  const [materiaalOn, setMateriaalOn] = useState(costSettings.materiaalEnabled);
  const [bandbreedteModus, setBandbreedteModus] = useState<BandbreedteModus>(
    costSettings.bandbreedteModus
  );

  const fieldErrors = state?.fieldErrors;
  const geraaktDoorArbeid = productCounts.totaal - productCounts.arbeidOverrides;
  const geraaktDoorTransport = productCounts.totaal - productCounts.transportOverrides;
  const geraaktDoorVoorrij = productCounts.totaal - productCounts.voorrijOverrides;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
          {fieldErrors && Object.keys(fieldErrors).length > 0 && (
            <> Controleer de gemarkeerde velden hieronder.</>
          )}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Kosteninstellingen opgeslagen.
        </p>
      )}

      <CostTypeCard
        title="Arbeidskosten"
        description="De standaardtarieven voor arbeidstijd van producten."
        enabled={arbeidOn}
        onToggle={setArbeidOn}
        toggleName="arbeidEnabled"
        visibleName="arbeidZichtbaar"
        visibleDefault={costSettings.arbeidZichtbaar}
      >
        <Field
          label="Reken in"
          htmlFor="arbeidStapEenheid"
          error={fieldErrors?.arbeidStapEenheid}
          help="kosteninstellingen.rekenEenheid"
        >
          <Select
            id="arbeidStapEenheid"
            name="arbeidStapEenheid"
            value={arbeidStapEenheid}
            onChange={(e) => setArbeidStapEenheid(e.target.value as ArbeidStapEenheid)}
          >
            <option value="UUR">Uren</option>
            <option value="DAGDEEL">Dagdelen</option>
            <option value="DAG">Dagen</option>
          </Select>
        </Field>
        <p className="text-xs text-muted-foreground">
          Nieuwe producten gebruiken standaard dit tarief. Vul voor de zekerheid alle drie de
          tarieven in — een product kan altijd in een andere eenheid rekenen dan hierboven gekozen.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tarief per uur" htmlFor="arbeidTariefUur" error={fieldErrors?.arbeidTariefUur}>
            <CurrencyInput
              id="arbeidTariefUur"
              name="arbeidTariefUur"
              defaultValue={costSettings.arbeidTariefUur}
              suffix="/ uur"
            />
          </Field>
          <Field
            label="Tarief per dagdeel"
            htmlFor="arbeidTariefDagdeel"
            error={fieldErrors?.arbeidTariefDagdeel}
          >
            <CurrencyInput
              id="arbeidTariefDagdeel"
              name="arbeidTariefDagdeel"
              defaultValue={costSettings.arbeidTariefDagdeel}
              suffix="/ dagdeel"
            />
          </Field>
          <Field label="Tarief per dag" htmlFor="arbeidTariefDag" error={fieldErrors?.arbeidTariefDag}>
            <CurrencyInput
              id="arbeidTariefDag"
              name="arbeidTariefDag"
              defaultValue={costSettings.arbeidTariefDag}
              suffix="/ dag"
            />
          </Field>
        </div>
        <label className="flex items-start gap-2 border-t border-border pt-4 text-sm text-foreground">
          <input
            type="checkbox"
            name="arbeidAfronden"
            defaultChecked={costSettings.arbeidAfronden}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Arbeidstijd afronden op hele {arbeidEenheidMeervoud(arbeidStapEenheid)}
            <span className="block font-normal text-muted-foreground">
              Standaard reken je continu door (bijv. 1,2 {arbeidEenheidMeervoud(arbeidStapEenheid)}
              ). Zet dit aan om per product altijd naar boven af te ronden op hele{" "}
              {arbeidEenheidMeervoud(arbeidStapEenheid)}.
            </span>
          </span>
        </label>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Geldt voor {geraaktDoorArbeid} van de {productCounts.totaal} producten — de rest heeft een
          eigen arbeidstarief.
        </p>
      </CostTypeCard>

      <CostTypeCard
        title="Transportkosten"
        description="Standaardbedrag voor het vervoeren van materiaal naar de klant."
        enabled={transportOn}
        onToggle={setTransportOn}
        toggleName="transportEnabled"
        visibleName="transportZichtbaar"
        visibleDefault={costSettings.transportZichtbaar}
      >
        <FieldRow>
          <Field label="Transportkosten" htmlFor="transportTarief" error={fieldErrors?.transportTarief}>
            <CurrencyInput
              id="transportTarief"
              name="transportTarief"
              defaultValue={costSettings.transportTarief}
            />
          </Field>
        </FieldRow>
        <p className="text-xs text-muted-foreground">
          Wijkt het bij een product af (bijv. zware materialen die apart vervoerd moeten worden)?
          Stel dat per product in bij het bewerken van dat product.
        </p>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Geldt voor {geraaktDoorTransport} van de {productCounts.totaal} producten — de rest heeft
          een eigen transportbedrag.
        </p>
      </CostTypeCard>

      <CostTypeCard
        title="Voorrijkosten"
        description="Standaardbedrag dat je in rekening brengt om bij de klant langs te komen."
        enabled={voorrijOn}
        onToggle={setVoorrijOn}
        toggleName="voorrijEnabled"
        visibleName="voorrijZichtbaar"
        visibleDefault={costSettings.voorrijZichtbaar}
      >
        <FieldRow>
          <Field label="Voorrijkosten" htmlFor="voorrijTarief" error={fieldErrors?.voorrijTarief}>
            <CurrencyInput
              id="voorrijTarief"
              name="voorrijTarief"
              defaultValue={costSettings.voorrijTarief}
            />
          </Field>
        </FieldRow>
        <p className="text-xs text-muted-foreground">
          Wijkt het bij een product af? Stel dat per product in bij het bewerken van dat product.
        </p>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Geldt voor {geraaktDoorVoorrij} van de {productCounts.totaal} producten — de rest heeft
          een eigen voorrijbedrag.
        </p>
      </CostTypeCard>

      <CostTypeCard
        title="Materiaalkosten"
        description="Kosten van de materialen die je bij een product instelt."
        enabled={materiaalOn}
        onToggle={setMateriaalOn}
        toggleName="materiaalEnabled"
        visibleName="materiaalZichtbaar"
        visibleDefault={costSettings.materiaalZichtbaar}
      >
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          De prijs per materiaal stel je in bij het product zelf — dat is al de volledige prijs die
          je de klant rekent, inclusief jouw marge. Geen apart opslagpercentage meer hier.
        </p>
      </CostTypeCard>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Prijsbandbreedte
            <HelpTip contentKey="kosteninstellingen.bandbreedteModus" />
          </CardTitle>
          <CardDescription>
            Geef een indicatieve bandbreedte in plaats van één vast bedrag. De drie standen
            sluiten elkaar uit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldRow>
            <Field
              label="Modus"
              htmlFor="bandbreedteModus"
              error={fieldErrors?.bandbreedteModus}
            >
              <Select
                id="bandbreedteModus"
                name="bandbreedteModus"
                value={bandbreedteModus}
                onChange={(e) => setBandbreedteModus(e.target.value as BandbreedteModus)}
              >
                <option value="GEEN">Geen bandbreedte — één vast bedrag</option>
                <option value="PER_PRODUCT">Per product — optellen van min/max-prijzen</option>
                <option value="TOTAAL">Over het totaal — marge op het eindtotaal</option>
              </Select>
            </Field>
          </FieldRow>
          {bandbreedteModus === "PER_PRODUCT" && (
            <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              Producten met een bandbreedte-prijs (in te stellen bij het product zelf) tellen mee
              als bandbreedte. Items met een vaste prijs tellen in beide scenario&apos;s hetzelfde
              mee.
            </p>
          )}
          {bandbreedteModus === "TOTAAL" && (
            <>
              <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Alle regels rekenen met hun vaste prijs; daarna wordt op het eindtotaal onderstaande
                marge toegepast.
              </p>
              <FieldRow>
                <Field
                  label="Marge omlaag"
                  htmlFor="bandbreedteMargeOmlaag"
                  error={fieldErrors?.bandbreedteMargeOmlaag}
                >
                  <CurrencyInput
                    id="bandbreedteMargeOmlaag"
                    name="bandbreedteMargeOmlaag"
                    defaultValue={costSettings.bandbreedteMargeOmlaag}
                    suffix="%"
                    symbol={false}
                  />
                </Field>
                <Field
                  label="Marge omhoog"
                  htmlFor="bandbreedteMargeOmhoog"
                  error={fieldErrors?.bandbreedteMargeOmhoog}
                >
                  <CurrencyInput
                    id="bandbreedteMargeOmhoog"
                    name="bandbreedteMargeOmhoog"
                    defaultValue={costSettings.bandbreedteMargeOmhoog}
                    suffix="%"
                    symbol={false}
                  />
                </Field>
              </FieldRow>
            </>
          )}
          {bandbreedteModus !== "TOTAAL" && (
            <>
              <input
                type="hidden"
                name="bandbreedteMargeOmlaag"
                value={costSettings.bandbreedteMargeOmlaag}
              />
              <input
                type="hidden"
                name="bandbreedteMargeOmhoog"
                value={costSettings.bandbreedteMargeOmhoog}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overig</CardTitle>
          <CardDescription>Algemene instellingen voor de calculator.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldRow>
            <Field
              label="BTW-percentage"
              htmlFor="btwPercentage"
              error={fieldErrors?.btwPercentage}
              help="kosteninstellingen.btw"
            >
              <CurrencyInput
                id="btwPercentage"
                name="btwPercentage"
                defaultValue={costSettings.btwPercentage}
                suffix="%"
                symbol={false}
              />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Instellingen opslaan"}
        </Button>
      </div>
    </form>
  );
}

function CostTypeCard({
  title,
  description,
  enabled,
  onToggle,
  toggleName,
  visibleName,
  visibleDefault,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  toggleName: string;
  visibleName: string;
  visibleDefault: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Switch
          name={toggleName}
          defaultChecked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </CardHeader>
      <CardContent
        className={cn("flex flex-col gap-4", !enabled && "opacity-50")}
        inert={!enabled}
      >
        {children}
        <div className="flex items-center gap-1.5 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name={visibleName}
              defaultChecked={visibleDefault}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Eye className="h-4 w-4 text-muted-foreground" />
            Zichtbaar voor klant
            <span className="text-muted-foreground">
              — telt mee in het totaal, maar de aparte regel wordt verborgen als je dit uitzet.
            </span>
          </label>
          <HelpTip contentKey="kosteninstellingen.zichtbaarVsActief" />
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  htmlFor,
  children,
  error,
  help,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
  help?: HelpContentKey;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {help && <HelpTip contentKey={help} />}
      </span>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function CurrencyInput({
  suffix,
  symbol = true,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  suffix?: string;
  symbol?: boolean;
}) {
  return (
    <div className="relative">
      {symbol && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          €
        </span>
      )}
      <DecimalInput
        className={cn(symbol && "pl-7", suffix && "pr-14", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}
