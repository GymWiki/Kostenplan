"use client";

import { useState } from "react";
import { DecimalInput, Label, Select } from "@/app/components/ui/input";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { BASIS_TARIEVEN_DEFAULTS } from "@/app/lib/presets/basis-tarieven";
import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

export type BasisTarievenStart = {
  arbeidStapEenheid?: ArbeidStapEenheid;
  arbeidTariefUur?: number;
  arbeidTariefDagdeel?: number;
  arbeidTariefDag?: number;
  voorrijTarief?: number;
  transportTarief?: number;
};

// De velden van de eenmalige basistarieven-vraag (arbeidseenheid + tarief,
// voorrijkosten, transport). Rendert gewone, benoemde velden in het
// omliggende <form> — gedeeld door de wizard (stap 3) en de onboarding, die
// het formulier elk op hun eigen manier verzenden.
export function BasisTarievenVelden({
  start = {},
  eenheidVergrendeld = false,
  idPrefix = "basis",
}: {
  start?: BasisTarievenStart;
  eenheidVergrendeld?: boolean;
  idPrefix?: string;
}) {
  const d = BASIS_TARIEVEN_DEFAULTS;
  const [eenheid, setEenheid] = useState<ArbeidStapEenheid>(
    eenheidVergrendeld ? start.arbeidStapEenheid ?? "UUR" : start.arbeidStapEenheid && start.arbeidStapEenheid !== "UUR" ? start.arbeidStapEenheid : "DAG"
  );
  const [tarieven, setTarieven] = useState({
    UUR: String(start.arbeidTariefUur ?? d.arbeidTariefUur),
    DAGDEEL: String(start.arbeidTariefDagdeel ?? d.arbeidTariefDagdeel),
    DAG: String(start.arbeidTariefDag ?? d.arbeidTariefDag),
  });

  const euroVeld = (id: string, name: string, waarde: string, onChange?: (v: string) => void, defaultValue?: string) => (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
      <DecimalInput
        id={id}
        name={name}
        {...(onChange ? { value: waarde, onChange: (e) => onChange(e.target.value) } : { defaultValue })}
        className="pl-7"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-eenheid`}>Hoe bereken je je arbeid?</Label>
        <Select
          id={`${idPrefix}-eenheid`}
          name={eenheidVergrendeld ? undefined : "arbeidStapEenheid"}
          value={eenheid}
          disabled={eenheidVergrendeld}
          onChange={(e) => setEenheid(e.target.value as ArbeidStapEenheid)}
        >
          <option value="DAG">Per dag</option>
          <option value="DAGDEEL">Per dagdeel</option>
          <option value="UUR">Per uur</option>
        </Select>
        {eenheidVergrendeld && <input type="hidden" name="arbeidStapEenheid" value={eenheid} />}
        {eenheidVergrendeld && (
          <p className="text-xs text-muted-foreground">Je bestaande werkzaamheden rekenen al zo; wijzigen kan via Prijzen.</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-tarief`}>Tarief per {arbeidEenheidEnkelvoud(eenheid)}</Label>
        {euroVeld(`${idPrefix}-tarief`, "arbeidTarief", tarieven[eenheid], (v) => setTarieven((t) => ({ ...t, [eenheid]: v })))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-voorrij`}>Voorrijkosten per project</Label>
          {euroVeld(`${idPrefix}-voorrij`, "voorrijTarief", "", undefined, String(start.voorrijTarief ?? d.voorrijTarief))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-transport`}>Transportkosten per project</Label>
          {euroVeld(`${idPrefix}-transport`, "transportTarief", "", undefined, String(start.transportTarief ?? d.transportTarief))}
        </div>
      </div>
    </div>
  );
}
