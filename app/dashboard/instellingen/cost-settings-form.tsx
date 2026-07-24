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
import { Eye, Layers } from "lucide-react";
import { arbeidEenheidEnkelvoud, arbeidEenheidMeervoud } from "@/app/lib/arbeid";
import type { HelpContentKey } from "@/app/lib/helpContent";
import type { ArbeidStapEenheid, BandbreedteModus, CostSettings } from "@/app/generated/prisma/client";

export function CostSettingsForm({
  costSettings,
}: {
  costSettings: CostSettings;
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
        description="Het standaardtarief voor arbeidstijd van producten. Diensten hebben hun eigen uurtarief of vaste projectprijs."
        enabled={arbeidOn}
        onToggle={setArbeidOn}
        toggleName="arbeidEnabled"
        visibleName="arbeidZichtbaar"
        visibleDefault={costSettings.arbeidZichtbaar}
      >
        <FieldRow>
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
          <Field
            label={`Tarief per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}`}
            htmlFor="arbeidTarief"
            error={fieldErrors?.arbeidTarief}
          >
            <CurrencyInput
              id="arbeidTarief"
              name="arbeidTarief"
              defaultValue={costSettings.arbeidTarief}
              suffix={`/ ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}`}
            />
          </Field>
        </FieldRow>
        {arbeidStapEenheid !== "UUR" && (
          <p className="text-xs text-muted-foreground">
            De totale arbeidstijd van alle diensten en producten samen wordt naar boven afgerond
            op hele {arbeidEenheidMeervoud(arbeidStapEenheid)}.
          </p>
        )}
        <PerProductRow
          name="arbeidTariefPerProduct"
          defaultChecked={costSettings.arbeidTariefPerProduct}
          label="Tarief per product instelbaar"
          description="Sta toe dat een product een eigen arbeidstarief heeft, in plaats van steeds dit tarief."
        />
      </CostTypeCard>

      <CostTypeCard
        title="Transportkosten"
        description="Kosten voor het vervoeren van materiaal naar de klant."
        enabled={transportOn}
        onToggle={setTransportOn}
        toggleName="transportEnabled"
        visibleName="transportZichtbaar"
        visibleDefault={costSettings.transportZichtbaar}
      >
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Transportkosten verschillen per product (denk aan zware materialen die apart vervoerd
          moeten worden). Stel per product een bedrag in bij het bewerken van dat product — hier
          bepaal je alleen of transportkosten meetellen en zichtbaar zijn voor de klant.
        </p>
      </CostTypeCard>

      <CostTypeCard
        title="Voorrijkosten"
        description="Vast bedrag dat je in rekening brengt om bij de klant langs te komen."
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
      </CostTypeCard>

      <CostTypeCard
        title="Materiaalkosten"
        description="Kosten van materialen en producten, met eventueel een opslagpercentage."
        enabled={materiaalOn}
        onToggle={setMateriaalOn}
        toggleName="materiaalEnabled"
        visibleName="materiaalZichtbaar"
        visibleDefault={costSettings.materiaalZichtbaar}
      >
        <FieldRow>
          <Field
            label="Opslag op materiaalkosten"
            htmlFor="materiaalMarge"
            error={fieldErrors?.materiaalMarge}
          >
            <CurrencyInput
              id="materiaalMarge"
              name="materiaalMarge"
              defaultValue={costSettings.materiaalMarge}
              suffix="%"
              symbol={false}
            />
          </Field>
        </FieldRow>
        <PerProductRow
          name="materiaalMargePerProduct"
          defaultChecked={costSettings.materiaalMargePerProduct}
          label="Opslag per product instelbaar"
          description="Sta toe dat een product een eigen opslagpercentage heeft, in plaats van steeds deze opslag."
        />
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
              Producten en diensten met een bandbreedte-prijs (in te stellen bij het product of de
              dienst zelf) tellen mee als bandbreedte. Items met een vaste prijs tellen in beide
              scenario&apos;s hetzelfde mee.
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

function PerProductRow({
  name,
  defaultChecked,
  label,
  description,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-2 border-t border-border pt-4 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
      />
      <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span>
        {label}
        <span className="block font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
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
