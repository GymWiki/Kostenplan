import { PrismaClient } from "../../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { HOVENIER_PRESETS, presetNaarDraft } from "../../app/lib/presets";
import { productCreateData } from "../../app/lib/werkzaamheid-db";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const UID = "00000000-0000-4000-8000-000000000001";

async function main() {
  await prisma.user.create({ data: { id: UID, email: "jan@devries-hoveniers.nl" } });
  const c = await prisma.company.create({
    data: { naam: "Hoveniersbedrijf De Vries", slug: "devries", createdBy: UID, subscriptionTier: "PLUS", subscriptionStatus: "ACTIVE", onboardingVoltooid: true, onboardingPortaalBekeken: true,
      members: { create: { userId: UID } } },
  });
  async function maakTool(naam: string, slug: string, presets: string[], status: "GEPUBLICEERD" | "CONCEPT", order: number) {
    const t = await prisma.tool.create({ data: { companyId: c.id, naam, slug, status, order } });
    await prisma.branding.create({ data: { toolId: t.id, toonTelefoonnummer: true, telefoonnummer: "06 12345678", toonEmail: true } });
    await prisma.costSettings.create({ data: { toolId: t.id } });
    let i = 0;
    for (const pid of presets) {
      const p = HOVENIER_PRESETS.find((x) => x.id === pid)!;
      await prisma.product.create({ data: productCreateData(t.id, presetNaarDraft(p, "DAGDEEL"), p, i++, { actief: i !== 3 }) });
    }
    return t;
  }
  const aanleg = await maakTool("Tuinaanleg", "tuinaanleg", ["bestrating", "schutting", "graszoden", "kunstgras"], "GEPUBLICEERD", 0);
  await maakTool("Onderhoud", "onderhoud", ["vlonder"], "CONCEPT", 1);

  const namen = ["Piet Jansen", "Marieke de Boer", "Ahmed El Idrissi", "Sanne Visser", "Kees Bakker", "Lotte Smit", "Tom Mulder", "Fatima Yilmaz", "Bram Dekker", "Eva Meijer"];
  const werk = ["Bestrating / terras", "Schutting", "Graszoden", "Kunstgras"];
  const prods = await prisma.product.findMany({ where: { toolId: aanleg.id } });
  for (let i = 0; i < namen.length; i++) {
    const totaal = 400 + i * 380.5;
    const lead = await prisma.lead.create({
      data: {
        companyId: c.id, toolId: aanleg.id, toolNaamSnapshot: "Tuinaanleg", naam: namen[i], email: `${namen[i].split(" ")[0].toLowerCase()}@example.nl`,
        telefoonnummer: i % 3 === 0 ? "" : `06 1234 56${10 + i}`, status: i < 4 ? "NIEUW" : i < 6 ? "IN_BEHANDELING" : i < 8 ? "OFFERTE_VERSTUURD" : "GEWONNEN",
        totaalIndicatie: totaal, createdAt: new Date(Date.now() - i * 5 * 3600_000),
        snapshot: { regels: [{ naam: werk[i % 4], type: "dienst", aantal: 10 + i * 4, eenheid: "m²", materiaal: "Klinkers", prijs: totaal, productId: prods[i % prods.length]?.id }],
          arbeidskosten: 200, materiaalkosten: totaal - 275, transportkosten: 40, voorrijkosten: 35, subtotaal: totaal / 1.21, btw: totaal - totaal / 1.21, totaal },
      },
    });
    if (i >= 4 && i < 8) {
      await prisma.offerte.create({ data: { leadId: lead.id, status: i < 6 ? "CONCEPT" : "VERSTUURD", regels: [{ id: "r1", omschrijving: werk[i % 4], aantal: 1, eenheid: "stuk", prijsPerEenheid: totaal / 1.21 }], geldigTot: new Date(Date.now() + 20 * 86400000), verstuurdOp: i >= 6 ? new Date() : null, deelToken: i >= 6 ? `tok${i}abcdefghijklmnop` : null } });
    }
  }
  console.log("seed klaar", c.id, aanleg.id);
}
main().then(() => prisma.$disconnect());
