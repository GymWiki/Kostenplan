// Regressierapport van de rekenkern (alleen lezen): voor elke bestaande rekentool met een vaste set
// voorbeeldinvoer het totaal van de oude berekening naast dat van de nieuwe rekenkern. Schrijft NIETS
// naar de database; er worden alleen leesqueries (findMany) uitgevoerd.
//
// Gebruik (met DATABASE_URL in de omgeving):
//   npm run prijzen:regressie
//   npm run prijzen:regressie -- --md docs/pricing-engine/regressie.md
// Of zonder database, vanuit een JSON-bestand met rekentools (zie docs/pricing-engine/README.md):
//   npm run prijzen:regressie -- --json rekentools.json
import fs from "node:fs";
import { formatCenten } from "../app/lib/pricing/format";
import { kenmerkenVan, regressieVoorTool, samenvatting, type RegressieRij, type RegressieTool } from "../app/lib/pricing/regressie";

function arg(naam: string): string | undefined {
  const i = process.argv.indexOf(naam);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function laadUitDatabase(): Promise<RegressieTool[]> {
  const { prisma } = await import("../app/lib/prisma");
  const tools = await prisma.tool.findMany({
    where: { deletedAt: null },
    orderBy: [{ companyId: "asc" }, { order: "asc" }],
    include: {
      company: { select: { naam: true, standaardArbeidTariefUur: true, standaardVoorrijTarief: true, standaardBtwPercentage: true } },
      costSettings: true,
      activeCalculatorConfig: { select: { config: true } },
      products: { orderBy: { order: "asc" }, include: { materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: { orderBy: { order: "asc" } } } }, extraOpties: { orderBy: { order: "asc" } } } },
    },
  });
  const uit: RegressieTool[] = [];
  for (const t of tools) {
    if (!t.costSettings) continue;
    uit.push({
      id: t.id,
      naam: t.naam,
      bedrijf: t.company.naam,
      company: t.company,
      costSettings: t.costSettings,
      calculatorConfig: t.activeCalculatorConfig?.config ?? null,
      products: t.products as unknown as RegressieTool["products"],
    });
  }
  await prisma.$disconnect();
  return uit;
}

function tabel(rijen: RegressieRij[]): string {
  const kop = "| Rekentool | Scenario | Oud | Nieuw | Verschil | Oorzaak |\n|---|---|---:|---:|---:|---|";
  const regels = rijen.map((r) => `| ${r.tool} (${r.bedrijf}) | ${r.scenario} | ${formatCenten(r.oudCenten)} | ${formatCenten(r.nieuwCenten)} | ${(r.verschilCenten / 100).toFixed(2).replace(".", ",")} | ${r.oorzaak} |`);
  return [kop, ...regels].join("\n");
}

async function main() {
  const json = arg("--json");
  const tools: RegressieTool[] = json ? JSON.parse(fs.readFileSync(json, "utf8")) : await laadUitDatabase();
  const alle: RegressieRij[] = [];
  const kenmerken = tools.map(kenmerkenVan);
  for (const t of tools) alle.push(...regressieVoorTool(t));

  const s = samenvatting(alle);
  const afwijkend = alle.filter((r) => r.oorzaak !== "gelijk");
  const onderzoeken = alle.filter((r) => r.oorzaak === "ONDERZOEKEN");
  const grootste = alle.reduce((m, r) => Math.max(m, Math.abs(r.verschilCenten)), 0);

  const md = [
    "# Regressierapport rekenkern",
    "",
    `Rekentools: ${tools.length} (${kenmerken.filter((k) => k.formules).length} met formules, ${kenmerken.filter((k) => !k.formules).length} met onderdelen). Scenario's: ${s.totaal}.`,
    "",
    "| Uitkomst | Aantal |",
    "|---|---:|",
    `| Exact gelijk | ${s.gelijk} |`,
    `| Afronding per regel (bewust, hoogstens enkele centen) | ${s.afronding} |`,
    `| **Te onderzoeken** | **${s.onderzoeken}** |`,
    "",
    `Grootste verschil: ${formatCenten(grootste)}.`,
    "",
    onderzoeken.length > 0 ? "## Te onderzoeken\n\n" + tabel(onderzoeken) : "Geen enkel scenario wijkt af buiten de afronding.",
    "",
    "## Alle afwijkingen (afronding)",
    "",
    afwijkend.length > 0 ? tabel(afwijkend) : "Geen.",
    "",
    "## Kenmerken van de rekentools",
    "",
    "| Rekentool | Type | Onderdelen | Onderdelen met meerdere materiaalcategorieën | Vaste kosten bij meer dan één onderdeel | Bandbreedte |",
    "|---|---|---:|---:|---|---|",
    ...kenmerken.map((k) => `| ${k.tool} (${k.bedrijf}) | ${k.formules ? "formules" : "onderdelen"} | ${k.onderdelen} | ${k.meerdereCategorieen} | ${k.vasteKostenPerOnderdeel ? "ja, per onderdeel" : "nee"} | ${k.bandbreedte} |`),
    "",
  ].join("\n");

  const uit = arg("--md");
  if (uit) fs.writeFileSync(uit, md);
  console.log(md);
  process.exit(s.onderzoeken > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
