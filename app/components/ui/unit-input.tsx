"use client";

import { DecimalInput } from "@/app/components/ui/input";
import { cn } from "@/app/lib/cn";

// Getalveld met vaste eenheid: prefix (bijv. "€") links en suffix (bijv. "/ m²")
// rechts BINNEN het veld, zodat de hovenier nooit hoeft te raden waarin hij
// invult. Gebouwd op DecimalInput (komma of punt, numeriek toetsenbord).
export function UnitInput({
  prefix,
  suffix,
  className,
  inputClassName,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> & {
  prefix?: string;
  suffix?: string;
  inputClassName?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      {prefix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        >
          {prefix}
        </span>
      )}
      <DecimalInput
        className={cn(prefix && "pl-8", suffix && "pr-16", inputClassName)}
        {...props}
      />
      {suffix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 max-w-[45%] -translate-y-1/2 truncate text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
