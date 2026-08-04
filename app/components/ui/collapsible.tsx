"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Generieke inklapbare sectie, standaard dicht — gebruikt voor "Verfijning"
// in het productformulier (minimumprijs, staffels, toeslagen, bandbreedte),
// zodat die geavanceerde instellingen niet in de weg staan maar wel zichtbaar
// is dát er iets is ingesteld via `summary`. Optioneel controlled (open/
// onOpenChange) zodat twee losse DOM-secties (bijv. velden binnen een
// <form> en losstaande subformulieren erbuiten) dezelfde open/dicht-status
// kunnen delen zonder <form> in <form> te nesten.
export function CollapsibleSection({
  title,
  summary,
  open,
  onOpenChange,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  summary?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <div className={cn("rounded-md border border-border", className)}>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {summary && !isOpen && (
            <span className="text-xs text-muted-foreground">{summary}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-4 border-t border-border p-4">{children}</div>
      )}
    </div>
  );
}
