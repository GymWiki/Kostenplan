import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LABELS } from "@/app/lib/subscription";
import { BrandingForm } from "./branding-form";

export const metadata: Metadata = { title: "Uiterlijk" };

export default async function BrandingPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { user, company } = await requireActiveTool(toolId);
  const plan = effectiveTier(company);

  // find-then-create (not upsert) so a plain page view never issues a
  // write — upsert's update branch still touches the row (and its
  // updatedAt) even with an empty payload, on every single visit.
  const branding =
    (await prisma.branding.findUnique({ where: { toolId } })) ??
    (await prisma.branding.create({ data: { toolId } }));

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Uiterlijk</h1>
        <p className="mt-1 text-muted-foreground">
          Maak deze rekentool jouw eigen: upload een logo, kies een huisstijl en pas de teksten aan
          die klanten zien — volledig los van je andere rekentools.
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

      <BrandingForm toolId={toolId} branding={branding} subscriptionTier={plan} email={user.email} />
    </div>
  );
}
