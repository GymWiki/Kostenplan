// Alleen-lezen audit: hoeveel bestaande rekentools/onderdelen passen in de
// standaardblokken van een werkzaamheid en hoeveel zijn "Aangepast"?
// Schrijft niets naar de database.
//
// Gebruik (met DATABASE_URL in de omgeving, bijv. via .env.local):
//   npm run audit:onderdelen
import { prisma } from "../app/lib/prisma";
import { analyseerRekentool } from "../app/lib/rekentool-analyse";

async function main() {
  const [tools, zonderEngine] = await Promise.all([
    prisma.tool.findMany({
      where: { deletedAt: null, activeCalculatorConfigId: { not: null } },
      select: { id: true, naam: true, costSettings: true },
    }),
    prisma.tool.count({ where: { deletedAt: null, activeCalculatorConfigId: null } }),
  ]);

  let standaard = 0;
  let omzetbaar = 0;
  let nietOmzetbaar = 0;
  let toolsNietOmzetbaar = 0;
  console.log(`Rekentools met standaardblokken (werkzaamheden): ${zonderEngine}`);
  console.log(`Rekentools op maat gebouwd: ${tools.length}\n`);

  for (const t of tools) {
    if (!t.costSettings) continue;
    const a = await analyseerRekentool(t.id, t.costSettings);
    if (a.soort !== "ANALYSE") {
      toolsNietOmzetbaar++;
      console.log(`- ${t.naam}: niet omzetbaar (${a.soort === "NIET_OMZETBAAR" ? a.reden : "geen"})`);
      continue;
    }
    for (const o of a.onderdelen) {
      if (o.classificatie.soort === "STANDAARD") standaard++;
      else if (o.classificatie.kanOmzetten) omzetbaar++;
      else nietOmzetbaar++;
      console.log(
        `- ${t.naam} / ${o.naam}: ${
          o.classificatie.soort === "STANDAARD" ? "past" : o.classificatie.kanOmzetten ? `Aangepast, omzetbaar met ${o.classificatie.verschillen.length} prijsverschil(len)` : "Aangepast, niet omzetbaar"
        }`
      );
    }
  }
  console.log(`\nOnderdelen die passen: ${standaard}`);
  console.log(`Aangepast maar omzetbaar (met prijsverschil): ${omzetbaar}`);
  console.log(`Aangepast en niet omzetbaar: ${nietOmzetbaar}`);
  console.log(`Rekentools die helemaal niet te analyseren zijn: ${toolsNietOmzetbaar}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
