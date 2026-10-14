"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/app/lib/cn";

export const LEGE_NAAM_MELDING = "Geef dit onderdeel een naam";

// De naam van een onderdeel, op één plek te wijzigen (desktop: vast veld in de kop van het paneel; mobiel: de titel van de sheet).
// - Mobiel ("tik"): de naam is tekst met een potlood als hint; tikken maakt er een veld van met de cursor erin. Enter of buiten
//   het veld tikken slaat op, Escape zet de oude naam terug.
// - Desktop ("vast"): het veld staat er altijd en slaat tijdens het typen op.
// - Een lege naam wordt nooit opgeslagen: de vorige naam blijft en bij het veld staat wat er mis is.
// - `focusBijStart`: een net aangemaakt onderdeel: de cursor staat direct in het veld en de tekst is geselecteerd.
export function OnderdeelNaam({
  waarde,
  onSla,
  modus,
  focusBijStart = false,
  onGefocust,
  className,
  maxLength = 120,
}: {
  waarde: string;
  onSla: (naam: string) => void;
  modus: "tik" | "vast";
  focusBijStart?: boolean;
  onGefocust?: () => void;
  className?: string;
  maxLength?: number;
}) {
  const [bewerken, setBewerken] = useState(modus === "vast" || focusBijStart);
  const [tekst, setTekst] = useState(waarde);
  const [fout, setFout] = useState<string | null>(null);
  const veld = useRef<HTMLInputElement>(null);
  const laatsteGeslagen = useRef(waarde);

  // Een naam die van buiten verandert (bijv. een ander onderdeel geselecteerd) volgen we, behalve tijdens het typen.
  useEffect(() => {
    laatsteGeslagen.current = waarde;
    if (document.activeElement !== veld.current) setTekst(waarde);
  }, [waarde]);

  const startSelectie = useRef(false);

  // Cursor in het veld en de tekst geselecteerd: typen vervangt de naam. (Pas na een korte tel: het paneel of de sheet is dan klaar met openen.)
  useEffect(() => {
    if (!focusBijStart) return;
    const t = setTimeout(() => {
      const el = veld.current;
      if (!el) return;
      if (document.activeElement !== el) el.focus({ preventScroll: true });
      if (!startSelectie.current) {
        startSelectie.current = true;
        el.select();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [focusBijStart]);

  // Tikken op de naam: het veld verschijnt, de cursor staat erin.
  useEffect(() => {
    if (modus === "tik" && bewerken && !focusBijStart) {
      veld.current?.focus({ preventScroll: true });
      veld.current?.select();
    }
  }, [modus, bewerken, focusBijStart]);

  function bevestig(naarBuiten: boolean): boolean {
    const schoon = tekst.trim();
    if (schoon === "") {
      setFout(LEGE_NAAM_MELDING);
      if (naarBuiten) {
        setTekst(waarde);
        if (modus === "tik") setBewerken(false);
      }
      return false;
    }
    setFout(null);
    if (schoon !== waarde && schoon !== laatsteGeslagen.current) {
      laatsteGeslagen.current = schoon;
      onSla(schoon);
    }
    setTekst(schoon);
    if (modus === "tik") setBewerken(false);
    return true;
  }

  const veldId = `onderdeel-naam-${useId()}`;

  if (modus === "tik" && !bewerken) {
    return (
      <div className={cn("min-w-0 flex-1", className)}>
        <button
          type="button"
          onClick={() => {
            setFout(null);
            setBewerken(true);
          }}
          // De kop van de sheet is een sleepvlak: een tik op de naam mag geen sleepgebaar starten.
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Naam van het onderdeel wijzigen: ${waarde}`}
          className="flex min-h-11 w-full min-w-0 cursor-text items-center gap-2 rounded-md text-left text-lg font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="min-w-0 truncate">{waarde}</span>
          <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        {fout && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {fout}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div className="relative">
        <label htmlFor={veldId} className="sr-only">
          Naam van het onderdeel
        </label>
        <input
          ref={veld}
          id={veldId}
          data-autofocus={focusBijStart ? "" : undefined}
          value={tekst}
          maxLength={maxLength}
          enterKeyHint="done"
          autoComplete="off"
          aria-invalid={fout ? true : undefined}
          aria-describedby={fout ? `${veldId}-fout` : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const nieuw = e.target.value;
            setTekst(nieuw);
            if (nieuw.trim() === "") {
              setFout(LEGE_NAAM_MELDING);
              return;
            }
            setFout(null);
            // Desktop slaat tijdens het typen op; mobiel pas bij Enter of tikken buiten het veld.
            if (modus === "vast" && nieuw.trim() !== waarde) {
              laatsteGeslagen.current = nieuw.trim();
              onSla(nieuw.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (bevestig(false)) veld.current?.blur();
            } else if (e.key === "Escape") {
              // Alleen het bewerken stopt; de sheet of het paneel blijft open.
              e.stopPropagation();
              setTekst(waarde);
              setFout(null);
              if (modus === "tik") setBewerken(false);
              else veld.current?.blur();
            }
          }}
          onFocus={(e) => {
            // Ook als een ander focus-effect (bijv. de sheet) het veld eerder focust dan onze timer: eerste keer alles selecteren.
            if (focusBijStart && !startSelectie.current) {
              startSelectie.current = true;
              e.currentTarget.select();
            }
          }}
          onBlur={() => {
            bevestig(true);
            // Pas als je het veld verlaat is het "eerste keer focussen" klaar; een herhaalde montage van het paneel zet de cursor er dan opnieuw in.
            if (focusBijStart) onGefocust?.();
          }}
          className={cn(
            "h-11 w-full min-w-0 rounded-md border bg-transparent pl-2 pr-9 text-lg font-bold text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
            fout ? "border-destructive" : modus === "vast" ? "border-transparent hover:border-input" : "border-input"
          )}
        />
        <Pencil className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
      {fout && (
        <p id={`${veldId}-fout`} role="alert" className="mt-1 text-sm font-medium text-destructive">
          {fout}
        </p>
      )}
    </div>
  );
}
