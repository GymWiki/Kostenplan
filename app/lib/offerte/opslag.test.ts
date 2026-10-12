import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { bewaarConcept, maakNieuweVersie, maakOfferte, OfferteVergrendeldFout, vergrendelVersie } from "./opslag";
import type { OfferteInhoud } from "./model";

const url = process.env.TEST_DATABASE_URL;
const inhoudVoor = (nummer: string, totaal = 10000): OfferteInhoud =>
  ({
    nummer,
    versie: 1,
    datum: "2026-10-15",
    geldigTot: "2026-11-15",
    afzender: { korActief: false } as OfferteInhoud["afzender"],
    klant: { type: "zakelijk" } as OfferteInhoud["klant"],
    secties: [{ id: "s1", titel: "Sectie", regels: [{ id: "r1", type: "normaal", omschrijving: "x", aantal: 1, eenheid: "post", prijsCenten: totaal, btw: 21, soort: "overig" }] }],
  }) as unknown as OfferteInhoud;

describe.skipIf(!url)("offerte-opslag (database)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 10 }) });
  const sleutel = `t${Date.now()}`;
  let companyId = "";
  beforeAll(async () => {
    const user = await db.user.create({ data: { id: `u-${sleutel}`, email: `${sleutel}@test.nl` } });
    const c = await db.company.create({ data: { naam: "Test", slug: sleutel, createdBy: user.id } });
    companyId = c.id;
  });
  afterAll(async () => {
    await db.company.deleteMany({ where: { id: companyId } });
    await db.user.deleteMany({ where: { id: `u-${sleutel}` } });
    await db.$executeRaw`DELETE FROM "OfferteNummerTeller" WHERE "companyId" = ${companyId}`;
    await db.$disconnect();
  });

  it("maakt bij parallelle aanvragen unieke offertenummers", async () => {
    const r = await Promise.all(Array.from({ length: 20 }, () => maakOfferte(db, { companyId, leadId: null, prefix: "", bouw: (n) => inhoudVoor(n) })));
    expect(new Set(r.map((x) => x.nummer)).size).toBe(20);
  });

  it("een verstuurde versie is onveranderlijk; wijzigen maakt een nieuwe versie", async () => {
    const { id, nummer } = await maakOfferte(db, { companyId, leadId: null, prefix: "T", bouw: (n) => inhoudVoor(n) });
    await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 20000) });
    await vergrendelVersie(db, { offerteId: id, versie: 1, pdfUrl: null, pdfHash: "abc" });
    await expect(bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 30000) })).rejects.toBeInstanceOf(OfferteVergrendeldFout);
    await db.offerteV2.update({ where: { id }, data: { status: "VERSTUURD" } });
    const v2 = await maakNieuweVersie(db, { offerteId: id, companyId });
    expect(v2).toBe(2);
    await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 30000) });
    const versies = await db.offerteVersie.findMany({ where: { offerteId: id }, orderBy: { versie: "asc" } });
    expect(versies.map((v) => v.totaalExclCenten)).toEqual([20000, 30000]);
    expect(versies[0].vergrendeld).toBe(true);
    expect(versies[1].vergrendeld).toBe(false);
  });

  it("een geaccepteerde offerte is definitief vergrendeld", async () => {
    const { id } = await maakOfferte(db, { companyId, leadId: null, prefix: "A", bouw: (n) => inhoudVoor(n) });
    await vergrendelVersie(db, { offerteId: id, versie: 1, pdfUrl: null, pdfHash: "h" });
    await db.offerteV2.update({ where: { id }, data: { status: "GEACCEPTEERD" } });
    await expect(maakNieuweVersie(db, { offerteId: id, companyId })).rejects.toBeInstanceOf(OfferteVergrendeldFout);
  });
});
