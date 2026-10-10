"use client";

import { Check } from "lucide-react";
import { cn } from "@/app/lib/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

// Keuzeknoppen (radiogroep) met korte voorbeeldtekst — vervangt een dropdown
// waar de hovenier alle opties in één oogopslag moet kunnen zien. Alleen
// toetsenbord-pijltjes via de native radio-inputs.
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  name: string;
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("grid grid-cols-2 gap-2 lg:grid-cols-4", className)}>
      {options.map((optie) => {
        const aan = optie.value === value;
        return (
          <label
            key={optie.value}
            className={cn(
              "relative flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border-[1.5px] p-3 transition-colors focus-within:ring-[3px] focus-within:ring-ring/35",
              aan ? "border-primary bg-accent" : "border-input bg-card hover:bg-secondary",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name={name}
              value={optie.value}
              checked={aan}
              disabled={disabled}
              onChange={() => onChange(optie.value)}
              className="sr-only"
            />
            <span className="flex items-start justify-between gap-2 text-sm font-semibold text-foreground">
              <span className="break-words">{optie.label}</span>
              {aan && <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            </span>
            {optie.description && (
              <span className="break-words text-xs leading-snug text-muted-foreground">{optie.description}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
