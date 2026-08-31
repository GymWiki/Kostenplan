"use client";

import { useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { formatCurrency } from "@/app/lib/format";
import { useCountUp } from "@/app/lib/use-count-up";
import { cn } from "@/app/lib/cn";

const LENGTES = [10, 20, 30] as const;
const MATERIALEN = ["Grenen", "Douglas", "Hardhout"] as const;
type Lengte = (typeof LENGTES)[number];
type Materiaal = (typeof MATERIALEN)[number];

// Vaste demo-prijzen (Deel 10: dit voert geen echte backendberekening uit,
// het is een marketingdemo met representatieve, vooraf bepaalde waarden) —
// oplopend met lengte én materiaalkwaliteit, zodat elke keuze een
// betekenisvol, realistisch prijsverschil laat zien.
const PRIJZEN: Record<Materiaal, Record<Lengte, number>> = {
  Grenen: { 10: 890, 20: 1650, 30: 2380 },
  Douglas: { 10: 990, 20: 1850, 30: 2690 },
  Hardhout: { 10: 1190, 20: 2290, 30: 3350 },
};

// Naast de scroll-driven demo (Deel 15: "overweeg een kleine échte
// interactieve demo") — hier verandert de prijs niet volgens een script,
// maar doordat de bezoeker daadwerkelijk klikt. Geen volledige
// calculator-builder, puur een klein, herkenbaar staaltje van hoe het voelt.
export function TryItDemo() {
  const [lengte, setLengte] = useState<Lengte>(20);
  const [materiaal, setMateriaal] = useState<Materiaal>("Douglas");
  const prijs = useCountUp(PRIJZEN[materiaal][lengte], 400);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
      <Card className="w-full border-primary/15 shadow-lg">
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">SchuttingDirect</p>
            <p className="font-semibold text-foreground">Bereken jouw schutting</p>
          </div>

          <PillGroup label="Lengte" opties={LENGTES.map((l) => ({ waarde: l, label: `${l} m` }))} actief={lengte} onSelect={setLengte} />
          <PillGroup label="Materiaal" opties={MATERIALEN.map((m) => ({ waarde: m, label: m }))} actief={materiaal} onSelect={setMateriaal} />

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground">Geschatte prijs</span>
            <span className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(prijs)}</span>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">Probeer het zelf — klik een lengte en materiaal aan.</p>
    </div>
  );
}

function PillGroup<T extends string | number>({
  label,
  opties,
  actief,
  onSelect,
}: {
  label: string;
  opties: { waarde: T; label: string }[];
  actief: T;
  onSelect: (waarde: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {opties.map((optie) => {
          const isActief = optie.waarde === actief;
          return (
            <button
              key={String(optie.waarde)}
              type="button"
              onClick={() => onSelect(optie.waarde)}
              aria-pressed={isActief}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActief
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {optie.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
