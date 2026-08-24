"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProductKeuzeOptieInvoer } from "@/app/lib/actions/calculator-config";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Input, Label } from "@/app/components/ui/input";

// Gedeeld tussen VeldFormModal (v1) en VeldSettingsForm (v2) — zie
// keuze-opties-editor.tsx voor dezelfde reden van bestaan.
export function ProductOptiesEditor({
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
