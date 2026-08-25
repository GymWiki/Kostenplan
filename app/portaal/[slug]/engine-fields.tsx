"use client";

import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/lib/cn";
import { parseGetal } from "@/app/lib/calculator-engine/fields";
import type { CalculatorField } from "@/app/lib/calculator-engine";

// ---------------------------------------------------------------------------
// Fase 8 — de klant-invoercomponenten van de generieke calculator-engine,
// één per veldsoort (Deel 10). Puur presentationeel: elk component krijgt
// zijn ruwe waarde en een onChange, en weet niets van scope/expressies/
// prijsregels — dat blijft de verantwoordelijkheid van engine-calculator.tsx.
// ---------------------------------------------------------------------------

export type MateriaalOptie = { id: string; naam: string; prijs: number };

function VeldWrapper({
  id,
  label,
  helpTekst,
  verplicht,
  children,
}: {
  // Alleen zetten wanneer er precies één control is om aan te koppelen
  // (tekst/getal/slider/dropdown). Voor keuzegroepen (radio/meerkeuze/
  // productkeuze) is dit een groepslabel zonder één-op-één control, dus
  // blijft htmlFor weg (elke optie krijgt daar al zijn eigen <label>).
  id?: string;
  label: string;
  helpTekst?: string;
  verplicht: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {verplicht && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {helpTekst && <p className="text-xs text-muted-foreground">{helpTekst}</p>}
    </div>
  );
}

export function EngineVeld({
  veld,
  waarde,
  onChange,
  materiaalOpties,
}: {
  veld: CalculatorField;
  waarde: unknown;
  onChange: (waarde: unknown) => void;
  materiaalOpties: Record<string, MateriaalOptie[]>;
}) {
  switch (veld.soort) {
    case "NUMMER":
    case "AANTAL":
    case "OPPERVLAKTE":
      return (
        <VeldWrapper id={veld.id} label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className="relative">
            <DecimalInput
              id={veld.id}
              value={typeof waarde === "string" ? waarde : (waarde as number | undefined)?.toString()}
              onChange={(e) => onChange(e.target.value)}
              placeholder={veld.standaardWaarde?.toString()}
              className={veld.eenheid ? "pr-16" : undefined}
            />
            {veld.eenheid && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {veld.eenheid}
              </span>
            )}
          </div>
        </VeldWrapper>
      );

    case "SLIDER": {
      const numeriek = parseGetal(waarde, veld.standaardWaarde ?? veld.min);
      return (
        <VeldWrapper id={veld.id} label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className="flex items-center gap-3">
            <input
              id={veld.id}
              type="range"
              min={veld.min}
              max={veld.max}
              step={veld.stap}
              value={numeriek}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-primary"
            />
            <span className="w-20 shrink-0 text-right text-sm font-medium text-foreground">
              {numeriek}
              {veld.eenheid ? ` ${veld.eenheid}` : ""}
            </span>
          </div>
        </VeldWrapper>
      );
    }

    case "TEKST":
      return (
        <VeldWrapper id={veld.id} label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <Input
            id={veld.id}
            value={typeof waarde === "string" ? waarde : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={veld.placeholder}
          />
        </VeldWrapper>
      );

    case "JA_NEE":
      return (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-foreground">{veld.label}</span>
          <Switch checked={waarde === true} onChange={(e) => onChange(e.target.checked)} />
        </label>
      );

    case "CHECKBOX":
      return (
        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
          <input
            type="checkbox"
            checked={waarde === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span className="text-sm font-medium text-foreground">{veld.label}</span>
        </label>
      );

    case "DROPDOWN":
      return (
        <VeldWrapper id={veld.id} label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <Select id={veld.id} value={typeof waarde === "string" ? waarde : ""} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>
              Kies een optie
            </option>
            {veld.opties.map((optie) => (
              <option key={optie.waarde} value={optie.waarde}>
                {optie.label}
              </option>
            ))}
          </Select>
        </VeldWrapper>
      );

    case "RADIO":
      return (
        <VeldWrapper label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className="flex flex-col gap-2">
            {veld.opties.map((optie) => (
              <label
                key={optie.waarde}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors",
                  waarde === optie.waarde ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
              >
                <input
                  type="radio"
                  name={veld.id}
                  checked={waarde === optie.waarde}
                  onChange={() => onChange(optie.waarde)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{optie.label}</span>
              </label>
            ))}
          </div>
        </VeldWrapper>
      );

    case "MEERKEUZE": {
      const gekozen = Array.isArray(waarde) ? (waarde as string[]) : [];
      function toggle(w: string) {
        onChange(gekozen.includes(w) ? gekozen.filter((x) => x !== w) : [...gekozen, w]);
      }
      return (
        <VeldWrapper label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className="flex flex-col gap-2">
            {veld.opties.map((optie) => (
              <label
                key={optie.waarde}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors",
                  gekozen.includes(optie.waarde) ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={gekozen.includes(optie.waarde)}
                  onChange={() => toggle(optie.waarde)}
                  className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{optie.label}</span>
              </label>
            ))}
          </div>
        </VeldWrapper>
      );
    }

    case "AFMETINGEN": {
      const invoer = (typeof waarde === "object" && waarde !== null ? waarde : {}) as Record<string, unknown>;
      const zetInvoer = (key: string, v: unknown) => onChange({ ...invoer, [key]: v });
      return (
        <VeldWrapper label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className={cn("grid gap-3", veld.metHoogte ? "grid-cols-3" : "grid-cols-2")}>
            <AfmetingDeelveld id={`${veld.id}-lengte`} label="Lengte" eenheid={veld.eenheid} waarde={invoer.lengte} onChange={(v) => zetInvoer("lengte", v)} />
            <AfmetingDeelveld id={`${veld.id}-breedte`} label="Breedte" eenheid={veld.eenheid} waarde={invoer.breedte} onChange={(v) => zetInvoer("breedte", v)} />
            {veld.metHoogte && (
              <AfmetingDeelveld id={`${veld.id}-hoogte`} label="Hoogte" eenheid={veld.eenheid} waarde={invoer.hoogte} onChange={(v) => zetInvoer("hoogte", v)} />
            )}
          </div>
        </VeldWrapper>
      );
    }

    case "PRODUCT_KEUZE": {
      const opties = materiaalOpties[veld.materialCategoryId] ?? [];
      return (
        <VeldWrapper label={veld.label} helpTekst={veld.helpTekst} verplicht={veld.verplicht}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {opties.map((optie) => (
              <label
                key={optie.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-4 py-3 transition-colors",
                  waarde === optie.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name={veld.id}
                    checked={waarde === optie.id}
                    onChange={() => onChange(optie.id)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">{optie.naam}</span>
                </span>
              </label>
            ))}
            {opties.length === 0 && (
              <p className="text-sm text-muted-foreground">Nog geen opties ingesteld.</p>
            )}
          </div>
        </VeldWrapper>
      );
    }
  }
}

function AfmetingDeelveld({
  id,
  label,
  eenheid,
  waarde,
  onChange,
}: {
  id: string;
  label: string;
  eenheid: string;
  waarde: unknown;
  onChange: (waarde: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label} ({eenheid})
      </label>
      <DecimalInput
        id={id}
        value={typeof waarde === "string" ? waarde : (waarde as number | undefined)?.toString()}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
