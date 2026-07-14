import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { BrandingForm } from "./branding-form";
import { SubscriptionCard } from "./subscription-card";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage() {
  const user = await requireUser();

  const branding = await prisma.branding.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Branding & Personalisatie</h1>
        <p className="mt-1 text-muted-foreground">
          Maak de rekentool jouw eigen: upload je logo, kies je huisstijl en pas de teksten aan
          die je klanten zien.
        </p>
      </div>

      <SubscriptionCard subscriptionTier={user.subscriptionTier} />

      <BrandingForm
        branding={branding}
        subscriptionTier={user.subscriptionTier}
        email={user.email}
      />
    </div>
  );
}
