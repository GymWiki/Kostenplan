// Maakt een lead met een snapshot mét opbouw (zoals de rekentool nu bewaart) voor de offerte-tests.
// Gebruik: DATABASE_URL=... npx tsx scripts/mobile-ux/seed-offerte-lead.ts <companyId> <toolId>
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";
import { calculateBreakdownRange, type CalcCostSettings } from "../../app/lib/calculate";
import { bouwLeadSnapshot, type SnapshotProduct } from "../../app/lib/lead-snapshot";

const kosten: CalcCostSettings = { arbeidEnabled: true, arbeidStapEenheid: "DAGDEEL", arbeidTariefUur: 55, arbeidTariefDagdeel: 180, arbeidTariefDag: 340, arbeidAfronden: false, transportEnabled: true, transportTarief: 60, voorrijEnabled: true, voorrijTarief: 35, materiaalEnabled: true, btwPercentage: 21, bandbreedteModus: "GEEN", bandbreedteMargeOmlaag: 0, bandbreedteMargeOmhoog: 0 };
const optie = (id: string, naam: string, prijs: number) => ({ id, naam, prijs, prijsType: "VAST" as const, prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null });
const products: SnapshotProduct[] = [
  { id: "p1", naam: "Terras", eenheid: "m2", productiviteit: 7, arbeidTariefOverride: null, transportkostenOverride: null, transportMeeschalend: false, voorrijkostenOverride: null, voorrijMeeschalend: false, materiaalCategorieen: [{ id: "c1", naam: "Tegel", materialen: [optie("t1", "Betonklinker 60×60", 48.75)] }, { id: "c2", naam: "Zand", materialen: [optie("z1", "Straatzand", 6.4)] }], extraOpties: [{ id: "e1", naam: "Afvoer grond en puin", prijs: 285, type: "PER_STUK", altijd: true }] },
  { id: "p2", naam: "Schutting", eenheid: "m1", productiviteit: 8, arbeidTariefOverride: null, transportkostenOverride: null, transportMeeschalend: false, voorrijkostenOverride: null, voorrijMeeschalend: false, materiaalCategorieen: [{ id: "c3", naam: "Hout", materialen: [optie("h1", "Douglas schutting", 85)] }], extraOpties: [] },
];
const qty = { p1: 24, p2: 14 };
const breakdown = calculateBreakdownRange({ products, productQty: qty, materialSelections: {}, extraSelections: {}, costSettings: kosten });
const snapshot = bouwLeadSnapshot({ products, productQty: qty, productRegelsBedrag: {}, materialSelections: {}, extraSelections: {}, breakdown, btwPercentage: 21 });

async function main() {
  const [companyId, toolId] = process.argv.slice(2);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const sleutel = `seed-${Date.now()}-abcdefghij`;
  const lead = await db.lead.create({ data: { companyId, toolId, toolNaamSnapshot: "Tuinaanleg", naam: "Mevrouw A. Jansen", email: "a.jansen@example.nl", telefoonnummer: "06 87654321", snapshot: snapshot as object, totaalIndicatie: snapshot.totaal, idempotentieSleutel: sleutel } });
  console.log(lead.id, snapshot.totaal);
  await db.$disconnect();
}
void main();
