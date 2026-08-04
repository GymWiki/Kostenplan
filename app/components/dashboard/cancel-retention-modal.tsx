"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Pause, ArrowDownCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label, Select, Textarea } from "@/app/components/ui/input";
import {
  cancelSubscriptionAction,
  pauseSubscriptionAction,
  type CompanyFormState,
} from "@/app/lib/actions/companies";
import { startCheckoutAction, type CheckoutFormState } from "@/app/lib/actions/subscription";
import type { BillingInterval, SubscriptionTier } from "@/app/generated/prisma/client";

const VERLIES_PLUS = [
  "Onbeperkt producten — terug naar maximaal 10",
  "Eigen logo en merkkleuren — terug naar de standaard Kostenplan-huisstijl",
  "De “Vraag offerte aan”-knop en je leads-overzicht verdwijnen",
];

const VERLIES_PRO_EXTRA = [
  "Rekentool insluiten via iframe op je eigen website",
  "Prioriteit bij support",
];

const REDEN_OPTIES: { value: string; label: string }[] = [
  { value: "TE_DUUR", label: "Te duur" },
  { value: "GEBRUIK_TE_WEINIG", label: "Ik gebruik het niet genoeg" },
  { value: "MIST_FUNCTIE", label: "Ik mis een functie" },
  { value: "ANDERS", label: "Anders" },
];

// Retentie-flow tussen "opzeggen" klikken en het daadwerkelijk bevestigen —
// bewust geen verplichte extra stappen: wie meteen wil opzeggen kan direct
// naar de laatste stap. Alleen alternatieven aanbieden (pauzeren/downgraden)
// vóór de definitieve bevestiging, niets dat opzeggen zelf blokkeert.
export function CancelRetentionModal({
  open,
  onClose,
  companyId,
  actualPlan,
  actualInterval,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  actualPlan: SubscriptionTier;
  actualInterval: BillingInterval | null;
}) {
  const [step, setStep] = useState<"opties" | "reden">("opties");
  // Terugzetten naar de eerste stap bij elke nieuwe keer openen — tijdens
  // render bijgewerkt (React's aanbevolen patroon voor het resetten van
  // state op een prop-wissel) i.p.v. in een effect, dat een extra,
  // vermijdbare re-render zou toevoegen.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStep("opties");
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const verliesItems = actualPlan === "PRO" ? [...VERLIES_PRO_EXTRA, ...VERLIES_PLUS] : VERLIES_PLUS;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-retention-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-4 top-4 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "opties" ? (
          <OptiesStep
            companyId={companyId}
            actualPlan={actualPlan}
            actualInterval={actualInterval}
            verliesItems={verliesItems}
            onClose={onClose}
            onDoorNaarOpzeggen={() => setStep("reden")}
          />
        ) : (
          <RedenStep
            companyId={companyId}
            onClose={onClose}
            onTerug={() => setStep("opties")}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

function OptiesStep({
  companyId,
  actualPlan,
  actualInterval,
  verliesItems,
  onClose,
  onDoorNaarOpzeggen,
}: {
  companyId: string;
  actualPlan: SubscriptionTier;
  actualInterval: BillingInterval | null;
  verliesItems: string[];
  onClose: () => void;
  onDoorNaarOpzeggen: () => void;
}) {
  const [pauseState, pauseAction, pausePending] = useActionState<CompanyFormState, FormData>(
    pauseSubscriptionAction.bind(null, companyId),
    null
  );
  const [downgradeState, downgradeAction, downgradePending] = useActionState<
    CheckoutFormState,
    FormData
  >(startCheckoutAction, null);

  useEffect(() => {
    if (pauseState && !pauseState.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseState]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id="cancel-retention-title" className="text-lg font-semibold text-foreground">
          Wat je kwijtraakt bij opzeggen
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {verliesItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-4">
        <p className="text-sm font-medium text-foreground">Misschien is dit genoeg</p>

        <form action={pauseAction} className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Pauzeer je abonnement: geen betalingen, je functies blijven gewoon werken tot de
            pauze afloopt.
          </p>
          {pauseState?.error && <p className="text-sm text-destructive">{pauseState.error}</p>}
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((maanden) => (
              <Button
                key={maanden}
                type="submit"
                name="maanden"
                value={maanden}
                variant="outline"
                size="sm"
                disabled={pausePending || downgradePending}
              >
                <Pause className="h-4 w-4" />
                {maanden} {maanden === 1 ? "maand" : "maanden"}
              </Button>
            ))}
          </div>
        </form>

        {actualPlan === "PRO" && (
          <form action={downgradeAction} className="flex flex-col gap-2 border-t border-border pt-3">
            <input type="hidden" name="plan" value="PLUS" />
            <input type="hidden" name="interval" value={actualInterval ?? "MAANDELIJKS"} />
            <p className="text-sm text-muted-foreground">
              Of downgrade naar Plus — je behoudt onbeperkt producten, je huisstijl en
              leads, en betaalt minder.
            </p>
            {downgradeState?.error && (
              <p className="text-sm text-destructive">{downgradeState.error}</p>
            )}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pausePending || downgradePending}
              className="self-start"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Downgrade naar Plus
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Ik blijf, bedankt
        </Button>
        <Button type="button" variant="ghost" className="flex-1" onClick={onDoorNaarOpzeggen}>
          Toch opzeggen
        </Button>
      </div>
    </div>
  );
}

function RedenStep({
  companyId,
  onClose,
  onTerug,
}: {
  companyId: string;
  onClose: () => void;
  onTerug: () => void;
}) {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(
    cancelSubscriptionAction.bind(null, companyId),
    null
  );
  const [reden, setReden] = useState("");

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id="cancel-retention-title" className="text-lg font-semibold text-foreground">
          Weet je het zeker?
        </h2>
        <p className="text-sm text-muted-foreground">
          Je abonnement wordt direct beëindigd en je bedrijf valt terug op Gratis.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reden">Reden (optioneel)</Label>
        <Select id="reden" name="reden" value={reden} onChange={(e) => setReden(e.target.value)}>
          <option value="">Liever niet zeggen</option>
          {REDEN_OPTIES.map((optie) => (
            <option key={optie.value} value={optie.value}>
              {optie.label}
            </option>
          ))}
        </Select>
      </div>

      {(reden === "MIST_FUNCTIE" || reden === "ANDERS") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="toelichting">Toelichting (optioneel)</Label>
          <Textarea
            id="toelichting"
            name="toelichting"
            placeholder={
              reden === "MIST_FUNCTIE" ? "Welke functie mis je?" : "Vertel ons waarom"
            }
          />
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" variant="destructive" className="flex-1" disabled={pending}>
          {pending ? "Bezig…" : "Ja, opzeggen"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onTerug}>
          Terug
        </Button>
      </div>
    </form>
  );
}
