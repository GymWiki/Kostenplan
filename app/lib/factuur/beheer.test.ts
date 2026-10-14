import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { BeheerFout, laadStand, maakCreditnotaConcept, registreerBetaling, verwijderBetaling } from "./beheer";
import { maakFactuurConcept, maakFactuurDefinitief } from "./opslag";
import { herberekenFactuurStatus } from "./beheer";
import { AFZENDER_OK, factuurInhoud, regel } from "./test-helpers";

// Integratietest tegen een echte database: TEST_DATABASE_URL=postgresql://… npx vitest run
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("betalingen en creditnota's (database)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url!, max: 6 }) });
  const sleutel = `b${Date.now()}`;
  let companyId = "";
  const prefix = { factuur: "F", credit: "C" };
  const instellingen = { betaaltermijnDagen: 14 };
  // 20 × €65 (21%) + 10 × €12 (9%) = 1300 + 120 = 1420 excl; btw 273 + 10,80 → €1.703,80 incl.
  const nieuweFactuur = async () => {
    const c = await maakFactuurConcept(db, { companyId, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud() });
    await maakFactuurDefinitief(db, { factuurId: c.id, companyId, afzender: AFZENDER_OK, prefix });
    return c.id;
  };
  const status = async (id: string) => (await db.factuur.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;

  beforeAll(async () => {
    const user = await db.user.create({ data: { id: `u-${sleutel}`, email: `${sleutel}@test.nl` } });
    companyId = (await db.company.create({ data: { naam: "Test", slug: sleutel, createdBy: user.id } })).id;
  });
  afterAll(async () => {
    await db.$executeRaw`SET session_replication_role = replica`;
    await db.company.deleteMany({ where: { id: companyId } });
    await db.$executeRaw`DELETE FROM "FactuurNummerTeller" WHERE "companyId" = ${companyId}`;
    await db.user.deleteMany({ where: { id: `u-${sleutel}` } });
    await db.$disconnect();
  });

  it("idempotentiesleutel: twee gelijktijdige aanvragen met dezelfde sleutel maken één betaling (dubbele klik in dezelfde tik)", async () => {
    const id = await nieuweFactuur();
    const invoer = { factuurId: id, companyId, bedragCenten: 5000, datum: "2026-10-20", sleutel: "dubbele-klik-sleutel-1" };
    await Promise.all([registreerBetaling(db, invoer), registreerBetaling(db, invoer)]);
    expect(await db.factuurBetaling.count({ where: { factuurId: id } })).toBe(1);
    // een herhaling later (bijv. na een time-out) doet ook niets; een nieuwe sleutel is een nieuwe betaling
    await registreerBetaling(db, invoer);
    expect(await db.factuurBetaling.count({ where: { factuurId: id } })).toBe(1);
    await registreerBetaling(db, { ...invoer, sleutel: "andere-sleutel-2" });
    expect(await db.factuurBetaling.count({ where: { factuurId: id } })).toBe(2);
    expect(await status(id)).toBe("DEELS_BETAALD");
  });

  it("deelbetalingen: deels betaald, daarna betaald; te veel kan niet; verwijderen herstelt de status", async () => {
    const id = await nieuweFactuur();
    const totaal = (await db.factuur.findUniqueOrThrow({ where: { id } })).totaalInclCenten;
    expect(totaal).toBe(170380);
    await registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 50000, datum: "2026-10-25" });
    expect(await status(id)).toBe("DEELS_BETAALD");
    await expect(registreerBetaling(db, { factuurId: id, companyId, bedragCenten: totaal, datum: "2026-10-25" })).rejects.toBeInstanceOf(BeheerFout);
    await registreerBetaling(db, { factuurId: id, companyId, bedragCenten: totaal - 50000, datum: "2026-10-26", methode: "CONTANT" });
    expect(await status(id)).toBe("BETAALD");
    const laatste = await db.factuurBetaling.findFirstOrThrow({ where: { factuurId: id }, orderBy: { createdAt: "desc" } });
    await verwijderBetaling(db, { betalingId: laatste.id, companyId });
    expect(await status(id)).toBe("DEELS_BETAALD");
    const regels = await db.factuurGebeurtenis.findMany({ where: { factuurId: id, soort: "BETALING" } });
    expect(regels).toHaveLength(2);
  });

  it("gelijktijdige betalingen kunnen samen nooit meer zijn dan het openstaande bedrag", async () => {
    const id = await nieuweFactuur();
    const r = await Promise.allSettled(Array.from({ length: 4 }, () => registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 100000, datum: "2026-10-25" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.factuurBetaling.count({ where: { factuurId: id } })).toBe(1);
  });

  it("creditnota voor geselecteerde regels verlaagt het openstaande bedrag; geheel crediteren geeft Gecrediteerd", async () => {
    const id = await nieuweFactuur();
    const orig = await db.factuur.findUniqueOrThrow({ where: { id } });
    const regelId = (orig.inhoud as unknown as { secties: { regels: { id: string }[] }[] }).secties[0].regels[1].id; // de planten (9%): 10 × €12 = €130,80 incl. → 13080
    const c1 = await maakCreditnotaConcept(db, { factuurId: id, companyId, regelIds: [regelId], instellingen });
    const concept = await db.factuur.findUniqueOrThrow({ where: { id: c1.id } });
    expect(concept.type).toBe("CREDITNOTA");
    expect(concept.creditVoorId).toBe(id);
    expect(concept.totaalInclCenten).toBe(-13080);
    await maakFactuurDefinitief(db, { factuurId: c1.id, companyId, afzender: AFZENDER_OK, prefix });
    await herberekenFactuurStatus(db, id, companyId);
    const na = await db.factuur.findUniqueOrThrow({ where: { id: c1.id } });
    expect(na.nummer).toMatch(/^C2026-/);
    expect(await status(id)).toBe("DEFINITIEF");
    // betaal het restant (1703,80 − 130,80 = 1573,00) → betaald
    await registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 157300, datum: "2026-10-27" });
    expect(await status(id)).toBe("BETAALD");
    await expect(registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 1, datum: "2026-10-27" })).rejects.toBeInstanceOf(BeheerFout);
  });

  it("geheel crediteren zet de factuur op Gecrediteerd; meer crediteren dan de factuur groot is kan niet", async () => {
    const id = await nieuweFactuur();
    const c = await maakCreditnotaConcept(db, { factuurId: id, companyId, instellingen });
    await expect(maakCreditnotaConcept(db, { factuurId: id, companyId, instellingen })).rejects.toBeInstanceOf(BeheerFout);
    await maakFactuurDefinitief(db, { factuurId: c.id, companyId, afzender: AFZENDER_OK, prefix });
    await herberekenFactuurStatus(db, id, companyId);
    expect(await status(id)).toBe("GECREDITEERD");
    await expect(registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 100, datum: "2026-10-27" })).rejects.toBeInstanceOf(BeheerFout);
  });

  // #67: elke actie op een factuur van een ander bedrijf moet "Factuur niet gevonden." geven, zonder iets te wijzigen.
  describe("een ander bedrijf kan niets aan deze factuur doen (#67)", () => {
    let anderId = "";
    beforeAll(async () => {
      const user = await db.user.create({ data: { id: `u2-${sleutel}`, email: `${sleutel}-2@test.nl` } });
      anderId = (await db.company.create({ data: { naam: "Ander", slug: `${sleutel}-ander`, createdBy: user.id } })).id;
    });
    afterAll(async () => {
      await db.$executeRaw`SET session_replication_role = replica`;
      await db.company.deleteMany({ where: { id: anderId } });
      await db.user.deleteMany({ where: { id: `u2-${sleutel}` } });
    });
    const staat = async (id: string) => {
      const f = await db.factuur.findUniqueOrThrow({ where: { id }, select: { status: true, betalingen: { select: { id: true } }, creditnotas: { select: { id: true } }, gebeurtenissen: { select: { id: true } } } });
      return JSON.stringify({ status: f.status, b: f.betalingen.length, c: f.creditnotas.length, g: f.gebeurtenissen.length });
    };

    it("betaling registreren", async () => {
      const id = await nieuweFactuur();
      const voor = await staat(id);
      await expect(registreerBetaling(db, { factuurId: id, companyId: anderId, bedragCenten: 100000, datum: "2026-10-13" })).rejects.toThrow("Factuur niet gevonden.");
      expect(await staat(id)).toBe(voor);
    });
    it("betaling verwijderen", async () => {
      const id = await nieuweFactuur();
      await registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 10000, datum: "2026-10-13" });
      const voor = await staat(id);
      const b = await db.factuurBetaling.findFirstOrThrow({ where: { factuurId: id } });
      await expect(verwijderBetaling(db, { betalingId: b.id, companyId: anderId })).rejects.toBeInstanceOf(BeheerFout);
      expect(await staat(id)).toBe(voor);
    });
    it("creditnota maken", async () => {
      const id = await nieuweFactuur();
      const voor = await staat(id);
      await expect(maakCreditnotaConcept(db, { factuurId: id, companyId: anderId, instellingen })).rejects.toThrow("Factuur niet gevonden.");
      expect(await staat(id)).toBe(voor);
    });
    it("status herberekenen en stand laden", async () => {
      const id = await nieuweFactuur();
      await expect(herberekenFactuurStatus(db, id, anderId)).rejects.toThrow("Factuur niet gevonden.");
      await expect(laadStand(db, id, anderId)).rejects.toThrow("Factuur niet gevonden.");
    });
    it("definitief maken", async () => {
      const c = await maakFactuurConcept(db, { companyId, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud() });
      await expect(maakFactuurDefinitief(db, { factuurId: c.id, companyId: anderId, afzender: AFZENDER_OK, prefix })).rejects.toThrow("Factuur niet gevonden.");
      expect(await status(c.id)).toBe("CONCEPT");
    });
  });

  it("een concept of een creditnota kan niet worden gecrediteerd", async () => {
    const c = await maakFactuurConcept(db, { companyId, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud({ regels: [regel("x", "Y", 1, 100)] }) });
    await expect(maakCreditnotaConcept(db, { factuurId: c.id, companyId, instellingen })).rejects.toBeInstanceOf(BeheerFout);
  });
});
