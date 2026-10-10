import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { WerkzaamheidEditor } from "../../editor/werkzaamheid-editor";
import { ExtraOptionsManager } from "./extra-options-manager";

export const metadata: Metadata = { title: "Werkzaamheid bewerken" };

export default async function BewerkWerkzaamheidPage({
  params,
}: {
  params: Promise<{ toolId: string; id: string }>;
}) {
  const { toolId, id } = await params;
  const { company } = await requireActiveTool(toolId);

  const [product, branding] = await Promise.all([
    prisma.product.findFirst({
      where: { id, toolId },
      include: {
        materiaalCategorieen: {
          orderBy: { order: "asc" },
          include: { materialen: { orderBy: { order: "asc" } } },
        },
        extraOpties: { orderBy: { order: "asc" } },
      },
    }),
    prisma.branding.findUnique({ where: { toolId } }),
  ]);
  if (!product) notFound();

  return (
    <WerkzaamheidEditor
      toolId={toolId}
      product={product}
      branding={branding}
      subscriptionTier={effectiveTier(company)}
      extraOptiesSectie={
        <ExtraOptionsManager productId={product.id} productEenheid={product.eenheid} extraOpties={product.extraOpties} />
      }
    />
  );
}
