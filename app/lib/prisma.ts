import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;
