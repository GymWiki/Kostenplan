"use client";

import { cn } from "@/app/lib/cn";

// Compacte keuzeschakelaar voor ≤ 4 opties (in plaats van een dropdown).
export function SegmentedControl<T extends string>({
  waarde,
  onChange,
  opties,
  label,
  className,
}: {
  waarde: T;
  onChange: (v: T) => void;
  opties: { waarde: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-secondary p-1", className)}>
      {opties.map((o) => {
        const aan = o.waarde === waarde;
        return (
          <button
            key={o.waarde}
            type="button"
            role="radio"
            aria-checked={aan}
            onClick={() => onChange(o.waarde)}
            className={cn(
              "flex h-11 min-w-0 cursor-pointer items-center justify-center truncate rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring",
              aan ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
