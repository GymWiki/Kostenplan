"use client";

import { ArrowDown, ArrowUp, Check, Circle, MousePointerClick } from "lucide-react";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/lib/cn";

export type StartWerkzaamheid = { id: string; naam: string; actief: boolean; heeftVoorbeeld: boolean };

// Zonder selectie: korte uitleg, de checklist en de lijst met werkzaamheden
// (met pijlknoppen: het toetsenbord- en touch-alternatief voor slepen).
export function PaneelStart({
  werkzaamheden,
  checklist,
  onKies,
  onVerplaats,
  onZichtbaar,
  onToevoegen,
  onChecklistKlik,
}: {
  werkzaamheden: StartWerkzaamheid[];
  checklist: { id: string; label: string; klaar: boolean; paneel: string }[];
  onKies: (id: string) => void;
  onVerplaats: (id: string, richting: -1 | 1) => void;
  onZichtbaar: (id: string, aan: boolean) => void;
  onToevoegen: () => void;
  onChecklistKlik: (paneel: string) => void;
}) {
  const klaar = checklist.filter((c) => c.klaar).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl bg-accent p-4">
        <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-foreground">Klik op een onderdeel van je rekentool om het aan te passen</h2>
          <p className="mt-1 text-sm text-foreground">
            Wijzigingen worden automatisch opgeslagen. Staat je rekentool al op je website? Dan zijn wijzigingen meteen live.
          </p>
        </div>
      </div>

      <section aria-labelledby="checklist-titel">
        <h2 id="checklist-titel" className="mb-2 flex items-baseline justify-between text-sm font-bold text-foreground">
          Voor je live gaat
          <span className="font-normal text-muted-foreground">
            {klaar} van {checklist.length}
          </span>
        </h2>
        <ul className="flex flex-col gap-1.5">
          {checklist.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChecklistKlik(c.paneel)}
                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-left text-sm font-medium text-foreground hover:bg-secondary"
              >
                {c.klaar ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={cn("min-w-0 flex-1", c.klaar && "text-muted-foreground line-through")}>{c.label}</span>
                <span className="sr-only">{c.klaar ? "Klaar" : "Nog te doen"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="wz-lijst-titel">
        <h2 id="wz-lijst-titel" className="mb-2 text-sm font-bold text-foreground">
          Je werkzaamheden
        </h2>
        {werkzaamheden.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen werkzaamheden. Voeg je eerste toe, bijvoorbeeld bestrating of een schutting.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {werkzaamheden.map((w, i) => (
              <li key={w.id} className="flex items-center gap-1 rounded-lg border border-border bg-card pl-3">
                <button
                  type="button"
                  onClick={() => onKies(w.id)}
                  className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm font-semibold text-foreground"
                >
                  <span className={cn("min-w-0 truncate", !w.actief && "text-muted-foreground")}>{w.naam || "Naamloos"}</span>
                  {w.heeftVoorbeeld && (
                    <span className="shrink-0 rounded-full border border-example bg-example/20 px-2 py-0.5 text-xs font-semibold">voorbeeld</span>
                  )}
                  {!w.actief && <span className="shrink-0 text-xs font-normal text-muted-foreground">verborgen</span>}
                </button>
                <Switch checked={w.actief} onChange={(e) => onZichtbaar(w.id, e.target.checked)} aria-label={`${w.naam} zichtbaar voor klanten`} />
                <button
                  type="button"
                  aria-label={`${w.naam} omhoog`}
                  disabled={i === 0}
                  onClick={() => onVerplaats(w.id, -1)}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${w.naam} omlaag`}
                  disabled={i === werkzaamheden.length - 1}
                  onClick={() => onVerplaats(w.id, 1)}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onToevoegen}
          className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-input px-4 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          + Werkzaamheid toevoegen
        </button>
      </section>
    </div>
  );
}
