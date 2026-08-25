"use client";

import { Plus, Trash2 } from "lucide-react";
import type { KeuzeOptie } from "@/app/lib/calculator-engine";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";

// Gedeeld tussen het modal-gebaseerde VeldFormModal (v1-tools, velden-tab.tsx)
// en het inline VeldSettingsForm (v2-tools, drie-koloms bouwer) — puur
// presentationeel, commit gebeurt altijd meteen via onChange.
export function KeuzeOptiesEditor({ opties, onChange }: { opties: KeuzeOptie[]; onChange: (opties: KeuzeOptie[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Keuze-opties</Label>
      {opties.map((optie, i) => (
        <div key={i} className="flex gap-2">
          <Input
            aria-label={`Optie ${i + 1}`}
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
