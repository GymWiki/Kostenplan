"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  BasisTarievenVelden,
  type BasisTarievenStart,
} from "@/app/components/dashboard/basis-tarieven-velden";
import { createStartpakketAction, type StartpakketFormState } from "@/app/lib/actions/onboarding";
import { cn } from "@/app/lib/cn";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { HOVENIER_PRESETS, VOORBEELD_LABEL } from "@/app/lib/presets";

export function StartpakketForm({
  ruimte,
  tarievenStart,
}: {
  // Aantal werkzaamheden dat het huidige abonnement nog toestaat, of null bij onbeperkt.
  ruimte: number | null;
  tarievenStart: BasisTarievenStart;
}) {
  const [state, formAction, pending] = useActionState<StartpakketFormState, FormData>(
    createStartpakketAction,
    null
  );
  const [gekozen, setGekozen] = useState<string[]>([]);

  const toggle = (id: string) =>
    setGekozen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const alleGekozen = gekozen.length === HOVENIER_PRESETS.length;
  const teVeel = ruimte !== null && gekozen.length > ruimte;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
          {state.error}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="werk-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="werk-heading" className="text-sm font-semibold text-foreground">
            Welke onderdelen doe je?
          </h2>
          <button
            type="button"
            onClick={() => setGekozen(alleGekozen ? [] : HOVENIER_PRESETS.map((p) => p.id))}
            className="shrink-0 cursor-pointer text-sm text-primary underline-offset-2 hover:underline"
          >
            {alleGekozen ? "Alles wissen" : "Alles selecteren"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HOVENIER_PRESETS.map((preset) => {
            const aan = gekozen.includes(preset.id);
            const Icon = PRODUCT_ICONS[preset.icoon];
            return (
              <label
                key={preset.id}
                className={cn(
                  "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
                  aan ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                )}
              >
                <input
                  type="checkbox"
                  name="preset"
                  value={preset.id}
                  checked={aan}
                  onChange={() => toggle(preset.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    aan ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"
                  )}
                >
                  {aan && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
                    <span className="break-words">{preset.naam}</span>
                  </span>
                  <span className="break-words text-xs text-muted-foreground">{preset.uitleg}</span>
                </span>
              </label>
            );
          })}
        </div>
        {teVeel && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Je pakket past {ruimte} werkzaamhe{ruimte === 1 ? "id" : "den"}. De eerste {ruimte} maak ik aan; de rest
            kun je later toevoegen met een upgrade.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border p-3 sm:p-4" aria-labelledby="tarief-heading">
        <div>
          <h2 id="tarief-heading" className="text-sm font-semibold text-foreground">
            Je vaste tarieven
          </h2>
          <p className="text-xs text-muted-foreground">
            Geldt voor al je werkzaamheden. {VOORBEELD_LABEL.charAt(0).toUpperCase() + VOORBEELD_LABEL.slice(1)}.
          </p>
        </div>
        <BasisTarievenVelden start={tarievenStart} idPrefix="onb" />
      </section>

      <Button type="submit" size="lg" disabled={pending || gekozen.length === 0} className="w-full">
        {pending ? "Je rekentool wordt gemaakt…" : `Maak mijn rekentool${gekozen.length ? ` (${gekozen.length})` : ""}`}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}
