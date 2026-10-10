import "server-only";

import { prisma } from "@/app/lib/prisma";
import { sessieHash, type GastGebeurtenisType } from "@/app/lib/gast";

// Funnel-gebeurtenis zonder persoonsgegevens (zie GastGebeurtenis in het schema).
// Mislukt dit, dan mag dat de flow nooit breken.
export async function logGastGebeurtenis(
  type: GastGebeurtenisType,
  opties: { userId?: string; bron?: string; metSite?: boolean } = {}
) {
  try {
    await prisma.gastGebeurtenis.create({
      data: {
        type,
        sessie: opties.userId ? sessieHash(opties.userId) : null,
        bron: opties.bron ?? "direct",
        metSite: opties.metSite ?? false,
      },
    });
  } catch (error) {
    console.error("Gast-gebeurtenis loggen mislukt", error);
  }
}
