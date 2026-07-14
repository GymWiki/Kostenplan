import type { BillingInterval } from "@/app/generated/prisma/client";

export type ParsedMollieMetadata = {
  companyId: string | null;
  legacyUserId: string | null;
  plan: "PLUS" | "PRO";
  interval: BillingInterval;
};

// Metadata bevat sinds de multi-company-migratie companyId. Abonnementen die
// vóór die migratie zijn aangemaakt hebben permanent alleen userId in hun
// Mollie-metadata (onveranderlijk na aanmaak bij Mollie) — die worden (zie
// resolveCompanyId in app/api/mollie/webhook/route.ts) via
// Company.migratedFromUserId naar hun (automatisch aangemaakte) company
// vertaald. Losstaand van de webhook-route zodat dit zonder Next.js-
// requestcontext getest kan worden — zie mollie-metadata.test.ts.
export function parseMollieMetadata(metadata: unknown): ParsedMollieMetadata | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const { companyId, userId, plan, interval } = metadata as Record<string, unknown>;
  if (
    (typeof companyId !== "string" && typeof userId !== "string") ||
    (plan !== "PLUS" && plan !== "PRO") ||
    (interval !== "MAANDELIJKS" && interval !== "JAARLIJKS")
  ) {
    return null;
  }
  return {
    companyId: typeof companyId === "string" ? companyId : null,
    legacyUserId: typeof userId === "string" ? userId : null,
    plan: plan as "PLUS" | "PRO",
    interval: interval as BillingInterval,
  };
}
