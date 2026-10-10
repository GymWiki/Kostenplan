import type { Metadata } from "next";
import { requireActiveTool, getBasisTarievenStatus } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { WerkzaamheidWizard } from "./werkzaamheid-wizard";

export const metadata: Metadata = { title: "Nieuwe werkzaamheid" };

export default async function NieuweWerkzaamheidPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company } = await requireActiveTool(toolId);

  const [branding, status, bestaande] = await Promise.all([
    prisma.branding.findUnique({ where: { toolId } }),
    getBasisTarievenStatus(toolId, company),
    prisma.product.findMany({ where: { toolId }, select: { naam: true }, take: 200 }),
  ]);

  return (
    <WerkzaamheidWizard
      toolId={toolId}
      branding={branding}
      subscriptionTier={effectiveTier(company)}
      bestaandeNamen={bestaande.map((p) => p.naam)}
      tarievenNogVoorbeeld={status.nogInstellen}
    />
  );
}
