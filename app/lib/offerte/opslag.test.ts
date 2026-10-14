import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { RevisieConflictFout, bewaarConcept, bewaarDeelklaarPdf, maakNieuweVersie, maakOfferte, OfferteVergrendeldFout, vergrendelVersie } from "./opslag";
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
    await bewaarDeelklaarPdf(db, { offerteId: id, versie: 1, pdf: Buffer.from("%PDF-test"), pdfHash: "abc" });
    await vergrendelVersie(db, { offerteId: id, versie: 1 });
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

  it("een wijziging na het klaarzetten wist de PDF; zonder PDF kan niet worden vergrendeld", async () => {
    const { id, nummer } = await maakOfferte(db, { companyId, leadId: null, prefix: "W", bouw: (n) => inhoudVoor(n) });
    await expect(vergrendelVersie(db, { offerteId: id, versie: 1 })).rejects.toBeInstanceOf(OfferteVergrendeldFout);
    await bewaarDeelklaarPdf(db, { offerteId: id, versie: 1, pdf: Buffer.from("%PDF-x"), pdfHash: "x" });
    await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 15000) });
    const v = await db.offerteVersie.findFirst({ where: { offerteId: id, versie: 1 } });
    expect(v?.pdfHash).toBeNull();
    expect(v?.pdfData).toBeNull();
  });

  it("een geaccepteerde offerte is definitief vergrendeld", async () => {
    const { id } = await maakOfferte(db, { companyId, leadId: null, prefix: "A", bouw: (n) => inhoudVoor(n) });
    await bewaarDeelklaarPdf(db, { offerteId: id, versie: 1, pdf: Buffer.from("%PDF-test"), pdfHash: "h" });
    await vergrendelVersie(db, { offerteId: id, versie: 1 });
    await db.offerteV2.update({ where: { id }, data: { status: "GEACCEPTEERD" } });
    await expect(maakNieuweVersie(db, { offerteId: id, companyId })).rejects.toBeInstanceOf(OfferteVergrendeldFout);
  });

  it("optimistic locking: een opslag met een verouderde revisie wordt geweigerd (twee tabbladen, beide volgordes) (#69)", async () => {
    const { id, nummer } = await maakOfferte(db, { companyId, leadId: null, prefix: "R", bouw: (n) => inhoudVoor(n) });
    const start = (await db.offerteVersie.findFirstOrThrow({ where: { offerteId: id, versie: 1 } })).revisie;
    // tabblad 1 en tabblad 2 openen dezelfde stand
    const r1 = await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 11000), verwachteRevisie: start });
    expect(r1).toBe(start + 1);
    // tabblad 2 slaat op een verouderde stand: geweigerd, en de inhoud van tabblad 1 blijft staan
    await expect(bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 22000), verwachteRevisie: start })).rejects.toBeInstanceOf(RevisieConflictFout);
    expect((await db.offerteVersie.findFirstOrThrow({ where: { offerteId: id, versie: 1 } })).totaalExclCenten).toBe(11000);
    // andersom: tabblad 2 laadt de nieuwste stand en slaat dan op; nu is tabblad 1 verouderd
    const r2 = await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 33000), verwachteRevisie: r1 });
    expect(r2).toBe(r1 + 1);
    await expect(bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 44000), verwachteRevisie: r1 })).rejects.toMatchObject({ huidigeRevisie: r2 });
    // doorlopend opslaan met de teruggegeven revisie blijft werken
    const r3 = await bewaarConcept(db, { offerteId: id, companyId, inhoud: inhoudVoor(nummer, 55000), verwachteRevisie: r2 });
    expect(r3).toBe(r2 + 1);
  });
});
