"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Ingeklapt blok: titel + samenvattingsregel + chevron; tikken opent. Gebruik
// `open`/`onToggle` om er een accordeon van te maken (één tegelijk open).
export function SamenvattingRij({
  titel,
  samenvatting,
  open,
  onToggle,
  waarschuwing,
  children,
  id,
}: {
  titel: string;
  samenvatting?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  waarschuwing?: string | null;
  children?: React.ReactNode;
  id: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <h3>
        <button
          type="button"
          id={`${id}-knop`}
          aria-expanded={open}
          aria-controls={`${id}-inhoud`}
          onClick={onToggle}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-semibold text-foreground">{titel}</span>
            {samenvatting != null && <span className="truncate text-sm text-muted-foreground">{samenvatting}</span>}
            {waarschuwing && <span className="text-sm font-medium text-warning">{waarschuwing}</span>}
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div id={`${id}-inhoud`} role="region" aria-labelledby={`${id}-knop`} className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}
