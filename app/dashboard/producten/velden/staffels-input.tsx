"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Label } from "@/app/components/ui/input";
import { unitLabel } from "@/app/lib/units";

export type StaffelRij = { vanaf: string; prijsPerEenheid: string };

// Cumulatieve staffels ("belastingschijf-stijl"): elke schijf geldt alleen
// voor de eenheden erbóven, niet voor het hele aantal — zie
// berekenGestaffeldBedrag() in calculate.ts. "Vanaf 0" (de basisprijs) is
// het product z'n gewone prijs per eenheid en staat dus niet in deze lijst.
export function StaffelsInput({
  eenheid,
  staffels,
  onChange,
}: {
  eenheid: string;
  staffels: StaffelRij[];
  onChange: (staffels: StaffelRij[]) => void;
}) {
  function updateStaffel(index: number, key: keyof StaffelRij, waarde: string) {
    onChange(staffels.map((s, i) => (i === index ? { ...s, [key]: waarde } : s)));
  }

  function verwijderStaffel(index: number) {
    onChange(staffels.filter((_, i) => i !== index));
  }

  function voegStaffelToe() {
    onChange([...staffels, { vanaf: "", prijsPerEenheid: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label>Staffels (optioneel)</Label>
        <p className="text-xs text-muted-foreground">
          Een ander tarief vanaf een bepaalde hoeveelheid, bijv. goedkoper per {unitLabel(eenheid)} boven de
          50 {unitLabel(eenheid)}. Geldt alleen voor de {unitLabel(eenheid)} boven de grens — niet voor de
          hele hoeveelheid.
        </p>
      </div>

      {staffels.map((staffel, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Vanaf ({unitLabel(eenheid)})</span>
            <DecimalInput
              value={staffel.vanaf}
              onChange={(e) => updateStaffel(index, "vanaf", e.target.value)}
              placeholder="Bijv. 50"
            />
          </div>
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Prijs per {unitLabel(eenheid)} vanaf dan</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
              </span>
              <DecimalInput
                value={staffel.prijsPerEenheid}
                onChange={(e) => updateStaffel(index, "prijsPerEenheid", e.target.value)}
                placeholder="Bijv. 8"
                className="pl-7"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => verwijderStaffel(index)}
            aria-label="Staffel verwijderen"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={voegStaffelToe} className="self-start">
        <Plus className="h-4 w-4" />
        Staffel toevoegen
      </Button>
    </div>
  );
}
