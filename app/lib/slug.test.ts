import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// Eén verbinding, net als in productie (app/lib/prisma.ts): zodra binnen een
// interactieve transactie een query via de globale client loopt, wacht die
// eeuwig op de verbinding die de transactie zelf vasthoudt (P2028, #72).
const url = process.env.TEST_DATABASE_URL;
const pool = vi.hoisted(() => ({ db: null as unknown as PrismaClient }));
vi.mock("@/app/lib/prisma", () => ({
  get prisma() {
    return pool.db;
  },
}));

import { generateUniqueSlug, generateUniqueToolSlug } from "./slug";

describe.skipIf(!url)("unieke slugs binnen een transactie (pool van 1 verbinding)", () => {
  const sleutel = `s${Date.now()}`;
  let companyId = "";
  beforeAll(async () => {
    pool.db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 1 }) });
    const user = await pool.db.user.create({ data: { id: `u-${sleutel}`, email: `${sleutel}@test.nl` } });
    companyId = (await pool.db.company.create({ data: { naam: "Test", slug: sleutel, createdBy: user.id } })).id;
    await pool.db.tool.create({ data: { companyId, naam: "Aanleg", slug: "aanleg", costSettings: { create: {} } } });
  });
  afterAll(async () => {
    await pool.db.company.deleteMany({ where: { id: companyId } });
    await pool.db.user.deleteMany({ where: { id: `u-${sleutel}` } });
    await pool.db.$disconnect();
  });

  it("generateUniqueToolSlug met tx loopt binnen $transaction niet vast", async () => {
    const slug = await pool.db.$transaction((tx) => generateUniqueToolSlug(companyId, "Aanleg", tx), { timeout: 3000 });
    expect(slug).toBe("aanleg-2");
  });

  it("generateUniqueSlug met tx loopt binnen $transaction niet vast", async () => {
    const slug = await pool.db.$transaction((tx) => generateUniqueSlug(sleutel, tx), { timeout: 3000 });
    expect(slug).toBe(`${sleutel}-2`);
  });

  it("zonder transactie werkt het zoals voorheen", async () => {
    expect(await generateUniqueToolSlug(companyId, "Onderhoud")).toBe("onderhoud");
  });
});
