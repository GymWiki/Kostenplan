"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { Badge } from "@/app/components/ui/badge";
import { PRIJZEN, PLAN_LABELS, jaarlijkseBesparing } from "@/app/lib/subscription";
import type { BillingInterval, SubscriptionTier } from "@/app/generated/prisma/client";

const PLANS: SubscriptionTier[] = ["GRATIS", "PLUS", "PRO"];

const FEATURES: Record<SubscriptionTier, string[]> = {
  GRATIS: [
    "Eigen rekentool voor je klantenportaal",
    "Tot 10 diensten en producten",
    "Alle kosteninstellingen (arbeid, transport, materiaal, btw)",
    "“Powered by Kostenplan”-badge op je portaal",
  ],
  PLUS: [
    "Alles van Gratis",
    "Onbeperkt diensten en producten",
    "Eigen logo en merkkleuren, geen badge",
    "“Vraag offerte aan”-knop voor leads",
  ],
  PRO: [
    "Alles van Plus",
    "Rekentool insluiten via iframe op je eigen website",
    "Prioriteit bij support",
  ],
};

const MEEST_GEKOZEN: SubscriptionTier = "PLUS";

export function PricingTable({
  currentPlan,
  defaultInterval = "MAANDELIJKS",
  renderCta,
}: {
  // Alleen relevant in het dashboard (na inloggen) — markeert het huidige
  // pakket. Op de publieke /prijzen-pagina wordt dit weggelaten.
  currentPlan?: SubscriptionTier;
  defaultInterval?: BillingInterval;
  renderCta: (plan: SubscriptionTier, interval: BillingInterval, isCurrent: boolean) => ReactNode;
}) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const maxBesparing = Math.max(jaarlijkseBesparing("PLUS"), jaarlijkseBesparing("PRO"));

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setInterval("MAANDELIJKS")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors",
            interval === "MAANDELIJKS"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Maandelijks
        </button>
        <button
          type="button"
          onClick={() => setInterval("JAARLIJKS")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            interval === "JAARLIJKS"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Jaarlijks
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              interval === "JAARLIJKS"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-accent text-accent-foreground"
            )}
          >
            tot {maxBesparing}% korting
          </span>
        </button>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan;
          const isBetaald = plan !== "GRATIS";
          const prijs = isBetaald ? PRIJZEN[plan][interval] : 0;
          const perMaandEquivalent =
            isBetaald && interval === "JAARLIJKS" ? PRIJZEN[plan].JAARLIJKS / 12 : null;

          return (
            <div
              key={plan}
              className={cn(
                "relative flex flex-col gap-6 rounded-xl border p-6",
                plan === MEEST_GEKOZEN
                  ? "border-primary bg-card shadow-md sm:-my-2 sm:py-8"
                  : "border-border bg-card"
              )}
            >
              {plan === MEEST_GEKOZEN && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
                  Meest gekozen
                </Badge>
              )}
              {isCurrent && (
                <Badge className="absolute -top-3 right-4" variant="success">
                  Jouw pakket
                </Badge>
              )}

              <div>
                <h3 className="text-lg font-semibold text-foreground">{PLAN_LABELS[plan]}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {formatCurrency(prijs)}
                  </span>
                  {isBetaald && (
                    <span className="text-sm text-muted-foreground">
                      / {interval === "JAARLIJKS" ? "jaar" : "maand"}
                    </span>
                  )}
                </div>
                {perMaandEquivalent !== null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Komt neer op {formatCurrency(perMaandEquivalent)} per maand — bespaar{" "}
                    {jaarlijkseBesparing(plan as "PLUS" | "PRO")}% t.o.v. maandelijks
                  </p>
                )}
                {!isBetaald && (
                  <p className="mt-1 text-sm text-muted-foreground">Altijd gratis, geen creditcard nodig</p>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2.5">
                {FEATURES[plan].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              {renderCta(plan, interval, isCurrent)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
