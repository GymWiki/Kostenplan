import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { FactuurRevisieConflictFout, bewaarFactuurConcept, FactuurControleFout, FactuurVergrendeldFout, maakFactuurConcept, maakFactuurDefinitief, slaFactuurPdfOp, verwijderFactuurConcept } from "./opslag";
import { formatteerFactuurNummer } from "./nummer";
import { AFZENDER_OK, factuurInhoud } from "./test-helpers";

describe("formatteerFactuurNummer", () => {
  it("prefix, jaar en volgnummer met 4 cijfers", () => {
    expect(formatteerFactuurNummer("F", 2026, 1)).toBe("F2026-0001");
    expect(formatteerFactuurNummer("C", 2026, 12)).toBe("C2026-0012");
    expect(formatteerFactuurNummer("HV-", 2026, 7)).toBe("HV-2026-0007");
  });
});

// Integratietest tegen een echte database: TEST_DATABASE_URL=postgresql://… npx vitest run
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("factuur-opslag (database)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 12 }) });
  const sleutel = `f${Date.now()}`;
  let companyId = "";
  const prefix = { factuur: "F", credit: "C" };
  const maak = (opties?: Parameters<typeof factuurInhoud>[0]) => maakFactuurConcept(db, { companyId, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud(opties) });
  const definitief = (factuurId: string, afzender = AFZENDER_OK) => maakFactuurDefinitief(db, { factuurId, companyId, afzender, prefix });

  beforeAll(async () => {
    const user = await db.user.create({ data: { id: `u-${sleutel}`, email: `${sleutel}@test.nl` } });
    const c = await db.company.create({ data: { naam: "Test", slug: sleutel, createdBy: user.id } });
    companyId = c.id;
  });
  afterAll(async () => {
    await db.company.deleteMany({ where: { id: companyId } });
    await db.$executeRaw`DELETE FROM "FactuurNummerTeller" WHERE "companyId" = ${companyId}`;
    await db.user.deleteMany({ where: { id: `u-${sleutel}` } });
    await db.$disconnect();
  });

  it("50 gelijktijdige 'definitief maken'-requests geven 50 unieke, aaneengesloten nummers", async () => {
    const ids = await Promise.all(Array.from({ length: 50 }, () => maak()));
    const uitkomst = await Promise.all(ids.map((f) => definitief(f.id)));
    const nummers = uitkomst.map((u) => u.nummer);
    expect(new Set(nummers).size).toBe(50);
    const volg = (await db.factuur.findMany({ where: { companyId, status: "DEFINITIEF" }, select: { volgnummer: true }, orderBy: { volgnummer: "asc" } })).map((x) => x.volgnummer);
    expect(volg).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(nummers).toContain("F2026-0001");
    expect(nummers).toContain("F2026-0050");
  });

  it("concepten weggooien en mislukte pogingen veroorzaken geen gaten", async () => {
    const a = await maak();
    const weg = await maak();
    const kapot = await maak();
    const b = await maak();
    await verwijderFactuurConcept(db, { factuurId: weg.id, companyId });
    // zonder KvK kan hij niet definitief: de transactie draait terug, ook de teller
    await expect(definitief(kapot.id, { ...AFZENDER_OK, kvkNummer: "" })).rejects.toBeInstanceOf(FactuurControleFout);
    const n1 = await definitief(a.id);
    const n2 = await definitief(b.id);
    expect(n1.nummer).toBe("F2026-0051");
    expect(n2.nummer).toBe("F2026-0052");
    const nog = await db.factuur.findUnique({ where: { id: kapot.id }, select: { status: true, nummer: true } });
    expect(nog).toEqual({ status: "CONCEPT", nummer: null });
  });

  it("een definitieve factuur kan niet worden gewijzigd of verwijderd (functies én directe database-aanroep)", async () => {
    const f = await maak();
    const { nummer } = await definitief(f.id);
    // via de opslagfuncties
    await expect(bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: factuurInhoud() })).rejects.toBeInstanceOf(FactuurVergrendeldFout);
    await expect(verwijderFactuurConcept(db, { factuurId: f.id, companyId })).rejects.toBeInstanceOf(FactuurVergrendeldFout);
    await expect(definitief(f.id)).rejects.toBeInstanceOf(FactuurVergrendeldFout);
    // directe SQL (de trigger in de database)
    await expect(db.$executeRaw`UPDATE "Factuur" SET "inhoud" = '{}'::jsonb WHERE "id" = ${f.id}`).rejects.toThrow(/definitieve factuur/);
    await expect(db.$executeRaw`UPDATE "Factuur" SET "totaalInclCenten" = 1 WHERE "id" = ${f.id}`).rejects.toThrow(/definitieve factuur/);
    await expect(db.$executeRaw`UPDATE "Factuur" SET "nummer" = 'X-1' WHERE "id" = ${f.id}`).rejects.toThrow(/definitieve factuur/);
    await expect(db.$executeRaw`UPDATE "Factuur" SET "status" = 'CONCEPT' WHERE "id" = ${f.id}`).rejects.toThrow(/definitieve factuur/);
    await expect(db.$executeRaw`DELETE FROM "Factuur" WHERE "id" = ${f.id}`).rejects.toThrow(/niet worden verwijderd/);
    await expect(db.factuur.delete({ where: { id: f.id } })).rejects.toThrow();
    // voortgang (status, verstuurd) mag wel
    await db.factuur.update({ where: { id: f.id }, data: { status: "VERSTUURD", verstuurdOp: new Date() } });
    const nu = await db.factuur.findUnique({ where: { id: f.id }, select: { nummer: true, status: true } });
    expect(nu).toEqual({ nummer, status: "VERSTUURD" });
  });

  it("de PDF kan één keer worden vastgelegd en daarna niet meer veranderen", async () => {
    const f = await maak();
    await definitief(f.id);
    expect(await slaFactuurPdfOp(db, { factuurId: f.id, companyId, pdf: Buffer.from("%PDF-1"), pdfHash: "aa" })).toBe(true);
    expect(await slaFactuurPdfOp(db, { factuurId: f.id, companyId, pdf: Buffer.from("%PDF-2"), pdfHash: "bb" })).toBe(false);
    await expect(db.$executeRaw`UPDATE "Factuur" SET "pdfHash" = 'cc' WHERE "id" = ${f.id}`).rejects.toThrow(/definitieve factuur/);
  });

  it("een creditnota heeft een eigen reeks", async () => {
    const f = await maak({ soort: "creditnota", regels: [{ id: "c1", type: "normaal", omschrijving: "Credit", aantal: 1, eenheid: "post", prijsCenten: -5000, btw: 21, soort: "overig" }] });
    const inh = factuurInhoud({ soort: "creditnota", regels: [{ id: "c1", type: "normaal", omschrijving: "Credit", aantal: 1, eenheid: "post", prijsCenten: -5000, btw: 21, soort: "overig" }] });
    inh.factuur.creditVoor = { nummer: "F2026-0001", datum: "2026-10-01" };
    await bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: inh });
    const { nummer } = await definitief(f.id);
    expect(nummer).toBe("C2026-0001");
  });

  it("een bedrijf met definitieve facturen kan wel (na export, in de app) worden verwijderd: de trigger blokkeert alleen losse verwijdering", async () => {
    const user = await db.user.create({ data: { id: `u2-${sleutel}`, email: `${sleutel}-2@test.nl` } });
    const c = await db.company.create({ data: { naam: "Weg", slug: `${sleutel}-weg`, createdBy: user.id } });
    const f = await maakFactuurConcept(db, { companyId: c.id, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud() });
    await maakFactuurDefinitief(db, { factuurId: f.id, companyId: c.id, afzender: AFZENDER_OK, prefix });
    await db.company.delete({ where: { id: c.id } });
    expect(await db.factuur.count({ where: { id: f.id } })).toBe(0);
    await db.user.delete({ where: { id: user.id } });
    await db.$executeRaw`DELETE FROM "FactuurNummerTeller" WHERE "companyId" = ${c.id}`;
  });

  it("optimistic locking: een opslag met een verouderde revisie wordt geweigerd (#69)", async () => {
    const f = await maak({});
    const start = (await db.factuur.findFirstOrThrow({ where: { id: f.id } })).revisie;
    const r1 = await bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: factuurInhoud(), verwachteRevisie: start });
    expect(r1).toBe(start + 1);
    await expect(bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: factuurInhoud(), verwachteRevisie: start })).rejects.toBeInstanceOf(FactuurRevisieConflictFout);
    const r2 = await bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: factuurInhoud(), verwachteRevisie: r1 });
    expect(r2).toBe(r1 + 1);
    // een definitieve factuur blijft "vergrendeld" (geen revisie-conflict)
    await definitief(f.id);
    await expect(bewaarFactuurConcept(db, { factuurId: f.id, companyId, inhoud: factuurInhoud(), verwachteRevisie: r2 })).rejects.toBeInstanceOf(FactuurVergrendeldFout);
  });
});
