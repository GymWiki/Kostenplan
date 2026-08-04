"use client";

import { Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { SJABLOON_OPTIES } from "@/app/lib/sjablonen";
import type { ProductSjabloon } from "@/app/generated/prisma/client";

// Sjabloonkeuze in gewone taal (label + voorbeelden), geen jargon zoals
// "variabele" of "formule" — zie de Toegankelijkheid-eisen uit de opdracht.
// Wisselen van sjabloon gooit de tot dan toe ingevulde sjabloon-instellingen
// weg (elk sjabloon heeft zijn eigen configvorm), dus dat gebeurt via
// `onKiesSjabloon` die zelf beslist of er eerst een bevestiging nodig is.
export function SjabloonPicker({
  waarde,
  onKiesSjabloon,
}: {
  waarde: ProductSjabloon;
  onKiesSjabloon: (sjabloon: ProductSjabloon) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SJABLOON_OPTIES.map((optie) => {
        const geselecteerd = optie.id === waarde;
        return (
          <button
            key={optie.id}
            type="button"
            onClick={() => onKiesSjabloon(optie.id)}
            aria-pressed={geselecteerd}
            className={cn(
              "flex flex-col gap-1 rounded-md border p-3 text-left transition-colors cursor-pointer",
              geselecteerd
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-secondary"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  geselecteerd ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {geselecteerd && <Check className="h-3 w-3" />}
              </span>
              <span className="text-sm font-medium text-foreground">{optie.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">{optie.voorbeeldenTekst}</span>
          </button>
        );
      })}
    </div>
  );
}
