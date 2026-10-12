import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { maakOffertePdf, sha256 } from "./pdf";
import { maakPrintToken } from "./pdf-token";
import type { OfferteInhoud } from "./model";

// Registreert het eerste openen door de klant (zonder tracking-pixels in de mail).
export async function registreerBekeken(offerte: { id: string; status: string; versie: number }): Promise<boolean> {
  const r = await prismaBasis.offerteV2.updateMany({ where: { id: offerte.id, eersteBekekenOp: null, status: "VERSTUURD" }, data: { eersteBekekenOp: new Date(), status: "BEKEKEN" } });
  if (r.count === 0) return false;
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: offerte.id, versieNummer: offerte.versie, soort: "BEKEKEN" } });
  return true;
}

// Zet een verlopen openstaande offerte ook in de database op Verlopen (idempotent).
export async function markeerVerlopen(offerteId: string): Promise<void> {
  await prismaBasis.offerteV2.updateMany({ where: { id: offerteId, status: { in: ["VERSTUURD", "BEKEKEN"] } }, data: { status: "VERLOPEN" } });
}

// Maakt (eenmalig) de getekende PDF van een akkoord: dezelfde offerte met het ingevulde akkoordblok.
export async function zorgVoorGetekendePdf(offerteId: string, basisUrl: string): Promise<Buffer | null> {
  const ak = await prismaBasis.offerteAkkoord.findFirst({ where: { offerteId }, include: { versie: { omit: { pdfData: true } } } });
  if (!ak) return null;
  const bestaand = await prismaBasis.offerteAkkoord.findUnique({ where: { id: ak.id }, select: { getekendePdfData: true } });
  if (bestaand?.getekendePdfData) return Buffer.from(bestaand.getekendePdfData);
  const inhoud = ak.versie.inhoud as unknown as OfferteInhoud;
  const pdf = await maakOffertePdf(`${basisUrl}/offerte-print/${maakPrintToken({ k: "versie", o: offerteId, v: ak.versieNummer, akkoord: true })}`, inhoud);
  await prismaBasis.offerteAkkoord.update({ where: { id: ak.id }, data: { getekendePdfData: new Uint8Array(pdf), getekendePdfHash: sha256(pdf) } });
  return pdf;
}
