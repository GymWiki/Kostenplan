"use client";

import { useActionState, useState } from "react";
import {
  updateCostSettingsAction,
  type CostSettingsFormState,
} from "@/app/lib/actions/cost-settings";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/lib/cn";
import type { CostSettings } from "@/app/generated/prisma/client";

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
  const [transportOn, setTransportOn] = useState(costSettings.transportEnabled);
  const [transportType, setTransportType] = useState(costSettings.transportType);
  const [voorrijOn, setVoorrijOn] = useState(costSettings.voorrijEnabled);
  const [materiaalOn, setMateriaalOn] = useState(costSettings.materiaalEnabled);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Kosteninstellingen opgeslagen.
        </p>
      )}

      <CostTypeCard
        title="Arbeidskosten"
        description="Het uurtarief dat je rekent voor het werk van jou en je team."
        enabled={arbeidOn}
        onToggle={setArbeidOn}
        toggleName="arbeidEnabled"
      >
        <FieldRow>
          <Field label="Uurtarief" htmlFor="arbeidTarief">
            <CurrencyInput
              id="arbeidTarief"
              name="arbeidTarief"
              defaultValue={costSettings.arbeidTarief}
              disabled={!arbeidOn}
              suffix="/ uur"
            />
          </Field>
        </FieldRow>
      </CostTypeCard>

      <CostTypeCard
        title="Transportkosten"
        description="Kosten voor het vervoeren van materiaal en machines naar de klant."
        enabled={transportOn}
        onToggle={setTransportOn}
        toggleName="transportEnabled"
      >
        <FieldRow>
          <Field label="Type" htmlFor="transportType">
            <Select
              id="transportType"
              name="transportType"
              value={transportType}
              onChange={(e) =>
                setTransportType(e.target.value as "VAST" | "PER_KM")
              }
              disabled={!transportOn}
            >
              <option value="VAST">Vast bedrag</option>
              <option value="PER_KM">Per kilometer</option>
            </Select>
          </Field>
          <Field
            label={transportType === "VAST" ? "Vast bedrag" : "Bedrag per km"}
            htmlFor="transportTarief"
          >
            <CurrencyInput
              id="transportTarief"
              name="transportTarief"
              defaultValue={costSettings.transportTarief}
              disabled={!transportOn}
              suffix={transportType === "VAST" ? undefined : "/ km"}
            />
          </Field>
        </FieldRow>
      </CostTypeCard>

      <CostTypeCard
        title="Voorrijkosten"
        description="Vast bedrag dat je in rekening brengt om bij de klant langs te komen."
        enabled={voorrijOn}
        onToggle={setVoorrijOn}
        toggleName="voorrijEnabled"
      >
        <FieldRow>
          <Field label="Voorrijkosten" htmlFor="voorrijTarief">
            <CurrencyInput
              id="voorrijTarief"
              name="voorrijTarief"
              defaultValue={costSettings.voorrijTarief}
              disabled={!voorrijOn}
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
      >
        <FieldRow>
          <Field label="Opslag op materiaalkosten" htmlFor="materiaalMarge">
            <CurrencyInput
              id="materiaalMarge"
              name="materiaalMarge"
              defaultValue={costSettings.materiaalMarge}
              disabled={!materiaalOn}
              suffix="%"
              symbol={false}
            />
          </Field>
        </FieldRow>
      </CostTypeCard>

      <Card>
        <CardHeader>
          <CardTitle>Overig</CardTitle>
          <CardDescription>Algemene instellingen voor de calculator.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldRow>
            <Field label="BTW-percentage" htmlFor="btwPercentage">
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
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  toggleName: string;
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
      <CardContent className={cn(!enabled && "opacity-50")}>
        {children}
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
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function CurrencyInput({
  suffix,
  symbol = true,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
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
      <Input
        type="number"
        step="0.01"
        min={0}
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
