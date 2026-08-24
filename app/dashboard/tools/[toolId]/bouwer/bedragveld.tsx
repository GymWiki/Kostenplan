"use client";

import { DecimalInput, Label } from "@/app/components/ui/input";

// Gedeeld tussen RegelFormModal (v1) en RegelSettingsForm (v2).
export function Bedragveld({ label, waarde, onChange }: { label: string; waarde: string; onChange: (waarde: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
        <DecimalInput value={waarde} onChange={(e) => onChange(e.target.value)} className="pl-7" />
      </div>
    </div>
  );
}
