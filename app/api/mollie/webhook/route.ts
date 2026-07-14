import { NextResponse, type NextRequest } from "next/server";
import type { Payment, Subscription } from "@mollie/api-client";
import { getMollieClient, getMollieWebhookUrl } from "@/app/lib/mollie";
import { prisma } from "@/app/lib/prisma";
import { MOLLIE_INTERVAL, PRIJZEN } from "@/app/lib/subscription";
import { parseMollieMetadata, type ParsedMollieMetadata } from "@/app/lib/mollie-metadata";
import type { MollieSubscriptionStatus, SubscriptionTier } from "@/app/generated/prisma/client";

// Mollie calls this with a form-encoded body containing only the payment id
// — never trust anything else in the payload, always re-fetch the payment
// (and, for recurring payments, the subscription) from Mollie's API to get
// the actual current status.
export async function POST(request: NextRequest) {
  let paymentId: FormDataEntryValue | null = null;
  try {
    paymentId = (await request.formData()).get("id");
  } catch {
    // Geen (geldig) form-encoded body — komt niet van Mollie zelf.
  }

  if (typeof paymentId !== "string" || !paymentId) {
    return NextResponse.json({ error: "Ontbrekend payment id" }, { status: 400 });
  }

  try {
    const mollie = getMollieClient();
    const payment = await mollie.payments.get(paymentId);

    if (payment.subscriptionId && payment.customerId) {
      // Een termijnbetaling van een bestaand abonnement — Mollie's
      // subscription-status is de bron van waarheid, niet de status van
      // deze ene betaling (die kan mislukken terwijl Mollie zelf nog
      // retries onderneemt voordat het abonnement echt wordt opgeschort).
      const subscription = await mollie.customerSubscriptions.get(payment.subscriptionId, {
        customerId: payment.customerId,
      });
      await syncSubscriptionStatus(payment.customerId, subscription);
    } else if (payment.status === "paid" && payment.sequenceType === "first") {
      await activateSubscription(payment, request.nextUrl.origin);
    }
  } catch (error) {
    // Mollie retries on any non-2xx response — logging and returning 200
    // avoids a retry storm for errors a retry can't fix (e.g. a bug in this
    // handler), while still surfacing the failure for manual follow-up.
    console.error("Mollie webhook verwerking mislukt:", error);
  }

  return NextResponse.json({ received: true });
}

// Vertaalt geparste metadata (companyId óf legacy userId) naar een echt
// companyId. Zie de toelichting bij migratedFromUserId in schema.prisma.
async function resolveCompanyId(metadata: ParsedMollieMetadata) {
  if (metadata.companyId) return metadata.companyId;
  if (!metadata.legacyUserId) return null;

  const company = await prisma.company.findUnique({
    where: { migratedFromUserId: metadata.legacyUserId },
    select: { id: true },
  });
  return company?.id ?? null;
}

async function activateSubscription(payment: Payment, fallbackBaseUrl: string) {
  const metadata = parseMollieMetadata(payment.metadata);
  if (!metadata || !payment.customerId || !payment.mandateId) {
    console.error("Mollie webhook: eerste betaling gemarkeerd betaald maar metadata/mandaat ontbreekt", {
      paymentId: payment.id,
    });
    return;
  }

  const companyId = await resolveCompanyId(metadata);
  if (!companyId) {
    console.error("Mollie webhook: kon geen company vinden voor eerste betaling", {
      paymentId: payment.id,
      metadata,
    });
    return;
  }

  const { plan, interval } = metadata;
  const bedrag = PRIJZEN[plan][interval];

  const subscription = await getMollieClient().customerSubscriptions.create({
    customerId: payment.customerId,
    amount: { currency: "EUR", value: bedrag.toFixed(2) },
    interval: MOLLIE_INTERVAL[interval],
    description: `Kostenplan ${plan} (${interval === "JAARLIJKS" ? "jaarlijks" : "maandelijks"})`,
    mandateId: payment.mandateId,
    webhookUrl: getMollieWebhookUrl(fallbackBaseUrl),
    metadata: { companyId, plan, interval },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionTier: plan,
      subscriptionStatus: "ACTIVE",
      billingInterval: interval,
      mollieSubscriptionId: subscription.id,
      huidigePeriodeEind: subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate) : null,
    },
  });
}

const STATUS_MAP: Record<Subscription["status"], MollieSubscriptionStatus> = {
  pending: "PENDING",
  active: "ACTIVE",
  canceled: "CANCELED",
  suspended: "SUSPENDED",
  completed: "COMPLETED",
};

// Een abonnement dat niet meer actief is, verliest het betaalde tier — het
// bedrijf valt terug op Gratis totdat een nieuwe betaling slaagt. Een
// handmatige overrideTier (Supabase Studio) wordt hier nooit door
// overschreven; dat wordt afgedwongen door effectiveTier() bij het lezen,
// niet door dit hier te respecteren — subscriptionTier zelf mag altijd de
// echte Mollie-status weerspiegelen. Matcht op mollieCustomerId (niet op
// metadata), dus dit werkt ongewijzigd voor zowel vóór- als ná-migratie
// abonnementen: mollieCustomerId is bij de migratie 1-op-1 overgezet naar
// Company.
async function syncSubscriptionStatus(mollieCustomerId: string, subscription: Subscription) {
  const status = STATUS_MAP[subscription.status];
  const metadata = parseMollieMetadata(subscription.metadata);
  const plan: SubscriptionTier = status === "ACTIVE" ? (metadata?.plan ?? "PLUS") : "GRATIS";

  await prisma.company.updateMany({
    where: { mollieCustomerId },
    data: {
      subscriptionStatus: status,
      subscriptionTier: plan,
      huidigePeriodeEind: subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate) : null,
    },
  });
}
