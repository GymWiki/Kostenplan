import type {
  BillingInterval,
  MollieSubscriptionStatus,
  SubscriptionTier,
} from "@/app/generated/prisma/client";

// Single source of truth for pricing — used by both the pricing table (what
// we show) and the checkout server action (what we actually charge via
// Mollie), so they can never drift apart.
export const PRIJZEN: Record<"PLUS" | "PRO", Record<BillingInterval, number>> = {
  PLUS: { MAANDELIJKS: 29, JAARLIJKS: 299 },
  PRO: { MAANDELIJKS: 69, JAARLIJKS: 700 },
};

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  GRATIS: "Gratis",
  PLUS: "Plus",
  PRO: "Pro",
};

// Gedeeld tussen /dashboard/abonnement (over het actieve bedrijf) en
// /dashboard/profiel ("Mijn bedrijven", over alle bedrijven tegelijk) zodat
// de statusteksten nooit uit elkaar kunnen lopen.
export const SUBSCRIPTION_STATUS_LABELS: Record<MollieSubscriptionStatus, string> = {
  GEEN: "Geen actief abonnement",
  PENDING: "Betaling wordt verwerkt",
  ACTIVE: "Actief",
  CANCELED: "Opgezegd",
  SUSPENDED: "Opgeschort — betaling mislukt",
  COMPLETED: "Afgerond",
};

// Mollie's subscription `interval` parameter format, e.g. "1 month".
export const MOLLIE_INTERVAL: Record<BillingInterval, string> = {
  MAANDELIJKS: "1 month",
  JAARLIJKS: "12 months",
};

// The actual savings percentage of paying jaarlijks vs. 12x maandelijks.
// Computed rather than hardcoded "15%" — €299/jaar vs €29 x 12 is really
// ~14.1% off, and €700/jaar vs €69 x 12 is ~15.5% off; a single flat
// "15% korting" label would be slightly wrong for both plans.
export function jaarlijkseBesparing(plan: "PLUS" | "PRO") {
  const maandelijksPerJaar = PRIJZEN[plan].MAANDELIJKS * 12;
  const jaarlijks = PRIJZEN[plan].JAARLIJKS;
  return Math.round((1 - jaarlijks / maandelijksPerJaar) * 100);
}

// Catalogus = Diensten + Producten samen. Boven deze grens kan een
// Gratis-tenant geen nieuwe items meer aanmaken (zie createProductAction /
// createServiceAction).
export const GRATIS_CATALOGUS_LIMIET = 10;

type TierUser = {
  subscriptionTier: SubscriptionTier;
  overrideTier: SubscriptionTier | null;
};

// De daadwerkelijk geldende tier: overrideTier (alleen via Supabase Studio
// te zetten) wint altijd van het Mollie-afgeleide subscriptionTier. Gebruik
// dit overal waar features worden vrijgegeven/geblokkeerd — nooit
// rechtstreeks user.subscriptionTier lezen voor gating-beslissingen.
export function effectiveTier(user: TierUser): SubscriptionTier {
  return user.overrideTier ?? user.subscriptionTier;
}

export function isBetaaldTier(tier: SubscriptionTier) {
  return tier !== "GRATIS";
}

export function isProTier(tier: SubscriptionTier) {
  return tier === "PRO";
}
