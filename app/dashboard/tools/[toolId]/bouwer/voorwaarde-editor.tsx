"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Select } from "@/app/components/ui/input";
import type { BeschikbareVariabele } from "./variabelen-utils";
import { COMPARATOR_LABELS, legeConditie, typeVoorVariabele, type Operator, type VoorwaardeConditie, type VoorwaardeGroep } from "./voorwaarde";

export { ontleedVoorwaarde, bouwVoorwaarde, legeConditie, type VoorwaardeGroep, type VoorwaardeConditie } from "./voorwaarde";

// Gedeelde conditie-builder-UI (Deel 5/8 van de opdracht: "ALS x=y", AND/OR
// ondersteund) — geëxtraheerd uit de conditie-UI die voorheen alleen inline
// in regels-tab.tsx zat (PriceRule.voorwaarde), nu ook gebruikt voor
// CalculatorField.zichtbaarAls en .verplichtAls (velden-tab.tsx). De pure
// ontleed-/bouwlogica staat in voorwaarde.ts (los van React, apart getest).
export function VoorwaardeEditor({
  groep,
  onChange,
  variabelen,
}: {
  groep: VoorwaardeGroep;
  onChange: (groep: VoorwaardeGroep) => void;
  variabelen: BeschikbareVariabele[];
}) {
  function wijzigConditie(index: number, patch: Partial<VoorwaardeConditie>) {
    const condities = groep.condities.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...groep, condities });
  }

  function verwijderConditie(index: number) {
    onChange({ ...groep, condities: groep.condities.filter((_, i) => i !== index) });
  }

  function voegConditieToe() {
    onChange({ ...groep, condities: [...groep.condities, legeConditie(variabelen)] });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {groep.condities.map((conditie, i) => {
        const veld = variabelen.find((v) => v.naam === conditie.variabele);
        return (
          <div key={i} className="flex flex-col gap-2 rounded-md bg-secondary/30 p-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{i === 0 ? "Als" : groep.combinator === "EN" ? "en" : "of"}</span>
              <Select
                value={conditie.variabele}
                onChange={(e) => {
                  const nieuweType = typeVoorVariabele(variabelen, e.target.value);
                  wijzigConditie(i, { variabele: e.target.value, operator: nieuweType === "OPTIONS" ? "BEVAT" : "GELIJK_AAN", waarde: "" });
                }}
                className="flex-1"
              >
                {variabelen.map((v) => (
                  <option key={v.naam} value={v.naam}>
                    {v.label}
                  </option>
                ))}
              </Select>
              {groep.condities.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => verwijderConditie(i)} aria-label="Voorwaarde verwijderen">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            {veld?.type === "BOOLEAN" ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">is</span>
                <Select value={conditie.waarde || "waar"} onChange={(e) => wijzigConditie(i, { waarde: e.target.value })} className="flex-1">
                  <option value="waar">aan</option>
                  <option value="onwaar">uit</option>
                </Select>
              </div>
            ) : veld?.type === "OPTIONS" ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">bevat</span>
                <Select value={conditie.waarde} onChange={(e) => wijzigConditie(i, { waarde: e.target.value })} className="flex-1">
                  <option value="" disabled>
                    Kies een optie
                  </option>
                  {veld.opties?.map((optie) => (
                    <option key={optie.waarde} value={optie.waarde}>
                      {optie.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <>
                <Select
                  value={conditie.operator}
                  onChange={(e) => wijzigConditie(i, { operator: e.target.value as Operator })}
                >
                  {Object.entries(COMPARATOR_LABELS)
                    .filter(([k]) => veld?.type === "NUMBER" || k === "GELIJK_AAN" || k === "NIET_GELIJK_AAN")
                    .map(([waarde, tekst]) => (
                      <option key={waarde} value={waarde}>
                        {tekst}
                      </option>
                    ))}
                </Select>
                {veld?.type === "OPTION" && veld.opties ? (
                  <Select value={conditie.waarde} onChange={(e) => wijzigConditie(i, { waarde: e.target.value })}>
                    <option value="" disabled>
                      Kies een optie
                    </option>
                    {veld.opties.map((optie) => (
                      <option key={optie.waarde} value={optie.waarde}>
                        {optie.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <DecimalInput value={conditie.waarde} onChange={(e) => wijzigConditie(i, { waarde: e.target.value })} />
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={voegConditieToe}>
          <Plus className="h-3.5 w-3.5" />
          Voorwaarde toevoegen
        </Button>
        {groep.condities.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Combineer met:</span>
            <Select
              value={groep.combinator}
              onChange={(e) => onChange({ ...groep, combinator: e.target.value as "EN" | "OF" })}
              className="w-auto"
            >
              <option value="EN">EN (alles moet kloppen)</option>
              <option value="OF">OF (minstens één moet kloppen)</option>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
