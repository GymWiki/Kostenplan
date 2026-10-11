import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prismaBasis: PrismaClient | undefined;
};

// max: 1 — DATABASE_URL wijst naar Supabase's transaction pooler (poort
// 6543), die zelf al veel clients multiplext over een klein aantal echte
// Postgres-verbindingen. Elke serverless function-instantie hoeft daar maar
// één sessie tegelijk mee te onderhouden; met de pg-default (10) opende elke
// instantie tot 10 verbindingen bij de pooler tegelijk, wat bij meerdere
// gelijktijdige Vercel-invocaties al snel de pool_size-limiet van de pooler
// zelf raakte ("EMAXCONNSESSION max clients reached in session mode").
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

// Altijd hergebruiken via een globalThis-singleton, ook in productie — niet
// (zoals voorheen) alleen in dev. Zonder dit maakt elke koude/warme
// serverless-invocatie waarin deze module opnieuw wordt geëvalueerd in
// principe een nieuwe PrismaClient (en dus een nieuwe pg Pool) aan, wat het
// verbindingsprobleem hierboven alleen maar erger maakt.
//
// `prismaBasis` is de kale client; hou die voor schrijfacties van het
// publicatiesysteem zelf. `prisma` (overal elders) is dezelfde client met één
// extra haak: een schrijfactie op iets wat in de rekentool-embed terechtkomt
// plant na afloop een nieuwe snapshot (zie app/lib/snapshot/plan.ts). De haak
// faalt nooit en vertraagt het opslaan niet.
export const prismaBasis = globalForPrisma.prismaBasis ?? new PrismaClient({ adapter });
globalForPrisma.prismaBasis = prismaBasis;

export const prisma = prismaBasis.$extends({
  name: "snapshot-publicatie",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const plan = await import("@/app/lib/snapshot/plan");
        if (!plan.raaktSnapshot(model, operation, args)) return query(args);

        // Bewerken/verwijderen: de tool-id's nú opzoeken (verwijderde rijen
        // zijn straks weg). Nieuwe rijen worden pas na afloop opgelost.
        const where = (args as { where?: Record<string, unknown> }).where;
        const voorIds = where ? await plan.toolIdsVoor({ model, where }) : [];
        const resultaat = await query(args);
        try {
          const id = (resultaat as { id?: unknown } | null)?.id;
          const na = typeof id === "string" && (operation === "create" || operation === "upsert")
            ? { model, where: { id } }
            : null;
          await plan.verwerkSchrijfactie(voorIds, na);
        } catch {
          // publiceren mag opslaan nooit laten mislukken
        }
        return resultaat;
      },
    },
  },
});
