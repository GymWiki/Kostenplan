import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LABELS } from "@/app/lib/subscription";
import { BrandingForm } from "./branding-form";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage() {
  const user = await requireUser();
  const plan = effectiveTier(user);

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

      {plan === "GRATIS" && (
        <p className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground">
          Je huidige pakket is {PLAN_LABELS[plan]}. Logo en merkkleuren zijn een Plus/Pro-feature —{" "}
          <Link href="/dashboard/abonnement" className="font-medium text-primary hover:underline">
            bekijk de pakketten
          </Link>
          .
        </p>
      )}

      <BrandingForm branding={branding} subscriptionTier={plan} email={user.email} />
    </div>
  );
}
