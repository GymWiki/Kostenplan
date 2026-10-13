"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { parseGetal } from "@/app/lib/getal";
import { cn } from "@/app/lib/cn";

// − / waarde / + voor hoeveelheden en werktempo. De waarde zelf is ook
// typbaar (decimaal toetsenbord); knoppen zijn 44 × 44 px.
export function Stepper({
  waarde,
  onChange,
  stap = 1,
  min = 0,
  max,
  label,
  eenheid,
  className,
}: {
  waarde: number;
  onChange: (n: number) => void;
  stap?: number;
  min?: number;
  max?: number;
  label: string;
  eenheid?: string;
  className?: string;
}) {
  // null = niet aan het typen: dan tonen we gewoon de waarde.
  const [tekst, setTekst] = useState<string | null>(null);

  const begrens = (n: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(n * 100) / 100));
  const knop =
    "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-input bg-card text-foreground disabled:cursor-not-allowed disabled:opacity-40 active:bg-secondary focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" aria-label={`${label} minder`} className={knop} disabled={waarde <= min} onClick={() => onChange(begrens(waarde - stap))}>
        <Minus className="h-5 w-5" aria-hidden="true" />
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        enterKeyHint="done"
        value={tekst ?? String(waarde).replace(".", ",")}
        onChange={(e) => {
          setTekst(e.target.value);
          const r = parseGetal(e.target.value, { soort: "aantal", negatief: min < 0 });
          if (r.ok) onChange(begrens(r.waarde));
        }}
        onBlur={() => setTekst(null)}
        className="h-11 w-20 min-w-0 rounded-lg border-[1.5px] border-input bg-card px-2 text-center text-base font-semibold tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
      />
      <button type="button" aria-label={`${label} meer`} className={knop} disabled={max != null && waarde >= max} onClick={() => onChange(begrens(waarde + stap))}>
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
      {eenheid && <span className="text-sm text-muted-foreground">{eenheid}</span>}
    </div>
  );
}
