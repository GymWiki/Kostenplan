import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { formatteerOfferteNummer } from "./nummer-formaat";
import { volgendeOfferteNummer } from "./nummer";

describe("formatteerOfferteNummer", () => {
  it("jaar-volgnummer met 4 cijfers en optioneel voorvoegsel", () => {
    expect(formatteerOfferteNummer("", 2026, 1)).toBe("2026-0001");
    expect(formatteerOfferteNummer("HV", 2026, 12)).toBe("HV-2026-0012");
    expect(formatteerOfferteNummer("", 2026, 12345)).toBe("2026-12345");
  });
});

// Integratietest tegen een echte database: TEST_DATABASE_URL=postgresql://… npx vitest run
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("volgendeOfferteNummer (parallel)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 10 }) });
  const bedrijf = `test-nummer-${Date.now()}`;
  afterAll(async () => {
    await db.$executeRaw`DELETE FROM "OfferteNummerTeller" WHERE "companyId" = ${bedrijf}`;
    await db.$disconnect();
  });

  it("geeft bij 50 gelijktijdige aanvragen 50 unieke, aaneengesloten nummers", async () => {
    const uitkomst = await Promise.all(Array.from({ length: 50 }, () => volgendeOfferteNummer(db, bedrijf, "")));
    const nummers = uitkomst.map((u) => u.nummer);
    expect(new Set(nummers).size).toBe(50);
    expect(uitkomst.map((u) => u.volgnummer).sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("telt per bedrijf apart", async () => {
    const a = await volgendeOfferteNummer(db, `${bedrijf}-b`, "X");
    expect(a.nummer).toMatch(/^X-\d{4}-0001$/);
    await db.$executeRaw`DELETE FROM "OfferteNummerTeller" WHERE "companyId" = ${`${bedrijf}-b`}`;
  });
});
