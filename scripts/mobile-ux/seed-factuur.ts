// Maakt voor de factuurtests: volledige bedrijfsgegevens, een geaccepteerde offerte met twee betaaltermijnen en een lead.
// Gebruik: DATABASE_URL=... npx tsx scripts/mobile-ux/seed-factuur.ts <companyId> <toolId>   (schrijft JSON met de ids naar stdout)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";
import { factuurInhoud, regel } from "../../app/lib/factuur/test-helpers";
import type { OfferteInhoud } from "../../app/lib/offerte/model";
import { eenFactuurUitOfferte, termijnFactuurUitOfferte } from "../../app/lib/factuur/maak";
import { maakFactuurConcept } from "../../app/lib/factuur/opslag";

async function main() {
  const [companyId, toolId] = process.argv.slice(2);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const A = factuurInhoud().afzender;
  await db.offerteGegevens.upsert({
    where: { companyId },
    create: { companyId, handelsnaam: A.handelsnaam, kvkNummer: A.kvkNummer, adresRegel: A.adresRegel, postcode: A.postcode, plaats: A.plaats, btwId: A.btwId, iban: A.iban, ibanTenaamstelling: A.ibanTenaamstelling, telefoon: A.telefoon, email: A.email, contactNaam: A.contactNaam, contactFunctie: A.contactFunctie },
    update: { handelsnaam: A.handelsnaam, kvkNummer: A.kvkNummer, adresRegel: A.adresRegel, postcode: A.postcode, plaats: A.plaats, btwId: A.btwId, iban: A.iban, ibanTenaamstelling: A.ibanTenaamstelling, telefoon: A.telefoon, email: A.email, contactNaam: A.contactNaam, contactFunctie: A.contactFunctie, korActief: false },
  });
  const sleutel = `fseed-${Date.now()}-abcdefghij`;
  const lead = await db.lead.create({ data: { companyId, toolId, toolNaamSnapshot: "Tuinaanleg", naam: "A. Jansen", email: "a.jansen@example.nl", telefoonnummer: "06 87654321", status: "OFFERTE_VERSTUURD", snapshot: { regels: [], arbeidskosten: 0, materiaalkosten: 0, transportkosten: 0, voorrijkosten: 0, subtotaal: 0, btw: 0, totaal: 0 }, totaalIndicatie: 0, idempotentieSleutel: sleutel } });
  const regels = [
    regel("a", "Bestrating terras, gebakken klinkers", 24, 7345, 21, { eenheid: "m²", soort: "materiaal" }),
    regel("b", "Arbeid bestrating", 6, 21000, 21, { eenheid: "dagdeel", soort: "arbeid" }),
    regel("c", "Haag planten, Carpinus betulus", 17, 1899, 9, { eenheid: "stuks", soort: "planten" }),
    { ...regel("d", "Grondwerk en afvoer", 1, 40000, 21), type: "stelpost" as const },
    { ...regel("e", "Verlichting", 1, 25000, 21), type: "optioneel" as const },
  ];
  const inhoud = { ...factuurInhoud(), factuur: undefined, nummer: "2026-0012", versie: 1, secties: [{ id: "s1", titel: "Tuin Kerkstraat 5", regels }], betaaltermijnen: [{ label: "Aanbetaling", percentage: 30 }, { label: "Bij oplevering", percentage: 70 }], voorwaarden: [], herroeping: { aan: true, tekst: "x" }, geldigTot: "2026-11-30" } as unknown as OfferteInhoud;
  const o = await db.offerteV2.create({ data: { companyId, leadId: lead.id, nummer: "2026-0012", token: `tok-${sleutel}`, status: "GEACCEPTEERD", verstuurdOp: new Date(), geldigTot: new Date("2026-11-30T12:00:00Z"), versies: { create: { versie: 1, inhoud: inhoud as object, totaalExclCenten: 0, totaalInclCenten: 0, vergrendeld: true, verstuurdOp: new Date(), pdfHash: "x" } } }, include: { versies: true } });
  await db.offerteAkkoord.create({ data: { offerteId: o.id, versieId: o.versies[0].id, naam: "A. Jansen", versieNummer: 1, gekozenRegelIds: ["e"], totaalInclCenten: 0, pdfHash: "x" } });
  const bron = { inhoud, gekozenOptioneel: ["e"], nummer: "2026-0012", versie: 1 };
  const inst = { betaaltermijnDagen: 14 };
  const metAfz = <T extends { afzender: unknown }>(i: T): T => ({ ...i, afzender: A });
  const totaal = await maakFactuurConcept(db, { companyId, leadId: lead.id, offerteId: o.id, offerteVersie: 1, inhoud: metAfz(eenFactuurUitOfferte(bron, inst)) });
  const termijn = await maakFactuurConcept(db, { companyId, leadId: lead.id, offerteId: o.id, offerteVersie: 1, inhoud: metAfz(termijnFactuurUitOfferte(bron, { label: "Aanbetaling", percentage: 30 }, inst)) });
  console.log(JSON.stringify({ leadId: lead.id, offerteId: o.id, totaal: totaal.id, termijn: termijn.id }));
  await db.$disconnect();
}
void main();
