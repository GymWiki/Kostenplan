"use server";

import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { blobGeconfigureerd } from "@/app/lib/snapshot/opslag";
import { publiceerTool } from "@/app/lib/snapshot/publiceer";

export type PublicatieStatus = { actief: boolean; vuil: boolean; fout: string | null };

async function lees(toolId: string): Promise<PublicatieStatus> {
  const rij = await prisma.tool.findUnique({ where: { id: toolId }, select: { snapshotVuil: true, snapshotFout: true } });
  return { actief: blobGeconfigureerd(), vuil: rij?.snapshotVuil ?? false, fout: rij?.snapshotFout ?? null };
}

// Vraagt de stand van de gepubliceerde kopie op (voor het statuslabel in de editor).
export async function publicatieStatusAction(toolId: string): Promise<PublicatieStatus> {
  await requireActiveTool(toolId);
  return lees(toolId);
}

// "Opnieuw proberen": publiceer nu, ongeacht eerdere fouten.
export async function publiceerOpnieuwAction(toolId: string): Promise<PublicatieStatus> {
  await requireActiveTool(toolId);
  await publiceerTool(toolId, { forceer: true });
  return lees(toolId);
}
