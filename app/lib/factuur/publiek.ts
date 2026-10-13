import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import type { FactuurStatus } from "@/app/generated/prisma/client";
import type { FactuurInhoud } from "./model";

export type PubliekeFactuur = {
  id: string;
  companyId: string;
  leadId: string | null;
  token: string;
  status: FactuurStatus;
  inhoud: FactuurInhoud;
  totaalInclCenten: number;
  betaaldCenten: number;
};

// Een concept bestaat voor de klant niet: de link werkt pas vanaf "Definitief maken".
export async function laadPubliekeFactuur(token: string): Promise<PubliekeFactuur | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const f = await prismaBasis.factuur.findUnique({ where: { token }, omit: { pdfData: true }, include: { betalingen: { select: { bedragCenten: true } } } });
  if (!f || f.status === "CONCEPT") return null;
  return {
    id: f.id,
    companyId: f.companyId,
    leadId: f.leadId,
    token: f.token,
    status: f.status,
    inhoud: f.inhoud as unknown as FactuurInhoud,
    totaalInclCenten: f.totaalInclCenten,
    betaaldCenten: f.betalingen.reduce((s, b) => s + b.bedragCenten, 0),
  };
}

// Eerste keer openen door de klant: bekeken-status en een regel in de tijdlijn (niet voor linkpreviews en scanners).
export async function registreerFactuurBekeken(id: string): Promise<boolean> {
  const r = await prismaBasis.factuur.updateMany({ where: { id, eersteBekekenOp: null, status: { not: "CONCEPT" } }, data: { eersteBekekenOp: new Date() } });
  if (r.count === 0) return false;
  await prismaBasis.factuurGebeurtenis.create({ data: { factuurId: id, soort: "BEKEKEN" } });
  return true;
}
