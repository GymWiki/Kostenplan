import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import type { FactuurInhoud } from "./model";
import type { ExportFactuur } from "./export";

const DAG = /^\d{4}-\d{2}-\d{2}$/;

// Definitieve facturen en creditnota's van een bedrijf in een periode (op factuurdatum), met betaald en gecrediteerd.
export async function laadExportFacturen(companyId: string, opties: { van?: string | null; tot?: string | null; status?: string | null } = {}) {
  const datum: { gte?: Date; lte?: Date } = {};
  if (opties.van && DAG.test(opties.van)) datum.gte = new Date(`${opties.van}T00:00:00Z`);
  if (opties.tot && DAG.test(opties.tot)) datum.lte = new Date(`${opties.tot}T00:00:00Z`);
  const rijen = await prismaBasis.factuur.findMany({
    where: { companyId, status: { not: "CONCEPT" }, nummer: { not: null }, ...(Object.keys(datum).length ? { factuurdatum: datum } : {}), ...(opties.status ? { status: opties.status as never } : {}) },
    orderBy: [{ factuurdatum: "asc" }, { volgnummer: "asc" }],
    omit: { pdfData: true },
    include: { betalingen: { select: { bedragCenten: true } }, creditnotas: { where: { status: { not: "CONCEPT" } }, select: { totaalInclCenten: true } } },
  });
  return rijen.map((f) => ({
    id: f.id,
    leadId: f.leadId,
    nummer: f.nummer as string,
    type: f.type as string,
    status: f.status as string,
    inhoud: f.inhoud as unknown as FactuurInhoud,
    betaaldCenten: f.betalingen.reduce((s, b) => s + b.bedragCenten, 0),
    gecrediteerdCenten: f.creditnotas.reduce((s, c) => s - c.totaalInclCenten, 0),
    totaalInclCenten: f.totaalInclCenten,
    vervaldatum: f.vervaldatum ? f.vervaldatum.toISOString().slice(0, 10) : null,
    factuurdatum: f.factuurdatum ? f.factuurdatum.toISOString().slice(0, 10) : null,
  })) satisfies (ExportFactuur & { id: string })[];
}

// Of dit bedrijf definitieve facturen heeft die nog niet in een volledige export zaten (voor "Bedrijf verwijderen").
export async function factuurExportStatus(companyId: string): Promise<{ aantal: number; geexporteerd: boolean }> {
  const [aantal, c] = await Promise.all([
    prismaBasis.factuur.count({ where: { companyId, status: { not: "CONCEPT" } } }),
    prismaBasis.company.findUnique({ where: { id: companyId }, select: { factuurExportOp: true } }),
  ]);
  const op = c?.factuurExportOp ?? null;
  if (aantal === 0) return { aantal: 0, geexporteerd: true };
  if (!op) return { aantal, geexporteerd: false };
  const later = await prismaBasis.factuur.count({ where: { companyId, status: { not: "CONCEPT" }, definitiefOp: { gt: op } } });
  return { aantal, geexporteerd: later === 0 };
}
