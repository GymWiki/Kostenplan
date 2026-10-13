import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { BeheerFout, maakCreditnotaConcept, registreerBetaling, verwijderBetaling } from "./beheer";
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
    await herberekenFactuurStatus(db, id);
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
    await herberekenFactuurStatus(db, id);
    expect(await status(id)).toBe("GECREDITEERD");
    await expect(registreerBetaling(db, { factuurId: id, companyId, bedragCenten: 100, datum: "2026-10-27" })).rejects.toBeInstanceOf(BeheerFout);
  });

  it("een concept of een creditnota kan niet worden gecrediteerd", async () => {
    const c = await maakFactuurConcept(db, { companyId, leadId: null, offerteId: null, offerteVersie: null, inhoud: factuurInhoud({ regels: [regel("x", "Y", 1, 100)] }) });
    await expect(maakCreditnotaConcept(db, { factuurId: c.id, companyId, instellingen })).rejects.toBeInstanceOf(BeheerFout);
  });
});
