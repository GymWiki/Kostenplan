import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { maakOffertePdf, sha256 } from "@/app/lib/offerte/pdf";
import { maakPrintToken } from "@/app/lib/offerte/pdf-token";
import type { FactuurInhoud } from "./model";
import { slaFactuurPdfOp } from "./opslag";

// De PDF van een factuur: dezelfde printpagina en Chromium als de offerte (zie app/lib/offerte/pdf.ts).
export async function maakFactuurPdf(basisUrl: string, factuurId: string, inhoud: FactuurInhoud): Promise<Buffer> {
  return maakOffertePdf(`${basisUrl}/offerte-print/${maakPrintToken({ k: "factuur", f: factuurId })}`, inhoud);
}

// De PDF van een definitieve factuur zoals hij is vastgelegd; bestaat hij nog niet, dan wordt hij nu uit de (onveranderlijke)
// inhoud gemaakt en eenmalig bewaard met zijn hash. Bij gelijktijdige aanroepen wint de eerste.
export async function zorgVoorFactuurPdf(basisUrl: string, factuurId: string, companyId?: string): Promise<{ pdf: Buffer; hash: string } | null> {
  const f = await prismaBasis.factuur.findFirst({ where: { id: factuurId, ...(companyId ? { companyId } : {}) }, select: { id: true, companyId: true, status: true, inhoud: true, pdfData: true, pdfHash: true } });
  if (!f || f.status === "CONCEPT") return null;
  if (f.pdfData && f.pdfHash) return { pdf: Buffer.from(f.pdfData), hash: f.pdfHash };
  const pdf = await maakFactuurPdf(basisUrl, f.id, f.inhoud as unknown as FactuurInhoud);
  const hash = sha256(pdf);
  if (await slaFactuurPdfOp(prismaBasis, { factuurId: f.id, companyId: f.companyId, pdf, pdfHash: hash })) return { pdf, hash };
  const nu = await prismaBasis.factuur.findUnique({ where: { id: f.id }, select: { pdfData: true, pdfHash: true } });
  return nu?.pdfData && nu.pdfHash ? { pdf: Buffer.from(nu.pdfData), hash: nu.pdfHash } : null;
}
