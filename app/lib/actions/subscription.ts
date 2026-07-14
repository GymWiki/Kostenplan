"use server";

import { redirect } from "next/navigation";
import { SequenceType } from "@mollie/api-client";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getMollieClient } from "@/app/lib/mollie";
import { getBaseUrl } from "@/app/lib/url";
import { checkoutSchema } from "@/app/lib/validation";
import { MOLLIE_INTERVAL, PRIJZEN } from "@/app/lib/subscription";

export type CheckoutFormState = { error?: string } | null;

export async function startCheckoutAction(
  _prevState: CheckoutFormState,
  formData: FormData
): Promise<CheckoutFormState> {
  const user = await requireUser();

  const parsed = checkoutSchema.safeParse({
    plan: formData.get("plan"),
    interval: formData.get("interval"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { plan, interval } = parsed.data;

  // Downgraden naar Gratis: het lopende Mollie-abonnement opzeggen (indien
  // aanwezig) in plaats van een betaling te starten.
  if (plan === "GRATIS") {
    if (user.mollieSubscriptionId && user.mollieCustomerId) {
      const mollie = getMollieClient();
      await mollie.customerSubscriptions.cancel(user.mollieSubscriptionId, {
        customerId: user.mollieCustomerId,
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: "GRATIS",
        subscriptionStatus: user.mollieSubscriptionId ? "CANCELED" : "GEEN",
      },
    });
    redirect("/dashboard/abonnement?gewijzigd=1");
  }

  const mollie = getMollieClient();
  const bedrag = PRIJZEN[plan][interval];
  const baseUrl = await getBaseUrl();

  // Al een actief Mollie-abonnement: pas het bestaande abonnement aan
  // (ander bedrag/interval) in plaats van een nieuwe eerste-betaling/mandaat
  // te starten — dat zou een tweede, dubbel-lopend abonnement opleveren.
  if (user.mollieSubscriptionId && user.mollieCustomerId && user.subscriptionStatus === "ACTIVE") {
    await mollie.customerSubscriptions.update(user.mollieSubscriptionId, {
      customerId: user.mollieCustomerId,
      amount: { currency: "EUR", value: bedrag.toFixed(2) },
      interval: MOLLIE_INTERVAL[interval],
      metadata: { userId: user.id, plan, interval },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: plan, billingInterval: interval },
    });
    redirect("/dashboard/abonnement?gewijzigd=1");
  }

  // Nieuwe (of nog niet eerder betalende) klant: eerst een Mollie-customer
  // aanmaken als die er nog niet is.
  let customerId = user.mollieCustomerId;
  if (!customerId) {
    const customer = await mollie.customers.create({
      name: user.bedrijfsnaam,
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { mollieCustomerId: customerId } });
  }

  const intervalLabel = interval === "JAARLIJKS" ? "jaarlijks" : "maandelijks";
  const payment = await mollie.payments.create({
    amount: { currency: "EUR", value: bedrag.toFixed(2) },
    description: `Kostenplan ${plan} (${intervalLabel})`,
    redirectUrl: `${baseUrl}/dashboard/abonnement?checkout=afgerond`,
    webhookUrl: `${baseUrl}/api/mollie/webhook`,
    customerId,
    sequenceType: SequenceType.first,
    metadata: { userId: user.id, plan, interval },
  });

  const checkoutUrl = payment.getCheckoutUrl();
  if (!checkoutUrl) {
    return { error: "Kon geen betaallink aanmaken. Probeer het opnieuw." };
  }

  redirect(checkoutUrl);
}
