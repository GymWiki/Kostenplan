// Zoekt offertes (oude vorm, Offerte.regels) waarin een onderdeel op € 0,00 staat terwijl er een restpost
// "Materiaal- en overige kosten" is, of een regel met aantal > 0 en prijs 0 naast een totaal > 0. Alleen lezen:
// er wordt niets aangepast.
//
//   DATABASE_URL=postgresql://… npx tsx scripts/offertes-nulprijzen.ts
import "dotenv/config";
import { prisma } from "../app/lib/prisma";
import { berekenOfferteTotalen, type OfferteRegel } from "../app/lib/offertes";

async function main() {
  const offertes = await prisma.offerte.findMany({ select: { id: true, status: true, regels: true, leadId: true, lead: { select: { naam: true, company: { select: { naam: true } } } } } });
  let verouderd = 0;
  let nulMetTotaal = 0;
  const lijst: string[] = [];
  for (const o of offertes) {
    const regels = (Array.isArray(o.regels) ? o.regels : []) as unknown as OfferteRegel[];
    const { subtotaal } = berekenOfferteTotalen(regels, 0);
    const restpost = regels.some((r) => r.id === "snapshot-restant" || r.omschrijving === "Materiaal- en overige kosten");
    const nulItem = regels.some((r) => !(r.id === "snapshot-restant") && r.aantal > 0 && r.prijsPerEenheid === 0);
    if (restpost && nulItem) {
      verouderd++;
      lijst.push(`${o.id}  ${o.status}  ${o.lead.company.naam} / ${o.lead.naam}  subtotaal ${subtotaal.toFixed(2)}`);
    } else if (nulItem && subtotaal > 0) nulMetTotaal++;
  }
  console.log(`Offertes: ${offertes.length}`);
  console.log(`Met onderdelen op € 0,00 én restpost (deze fix): ${verouderd}`);
  console.log(`Met een regel op € 0,00 naast een totaal > 0, zonder restpost (mogelijk bewust, controleren): ${nulMetTotaal}`);
  for (const l of lijst) console.log("  " + l);
}
main().finally(() => prisma.$disconnect());
