import type { PrismaClient } from "@/app/generated/prisma/client";
import { statusNaMutatie, valideerBetaling, BETALING_FOUT_TEKST, type BetalingsStand } from "./betaling";
import { creditnotaUitFactuur, type FactuurInstellingen } from "./maak";
import type { FactuurInhoud } from "./model";
import { maakFactuurConcept } from "./opslag";
import { factuurTotalen } from "./totalen";

// Beheer van een definitieve factuur: betalingen en creditnota's. Alleen status (en betalingen/gebeurtenissen) veranderen;
// de factuur zelf blijft onveranderd (de database dwingt dat af).

export class BeheerFout extends Error {}

type Db = Pick<PrismaClient, "factuur" | "factuurBetaling" | "factuurGebeurtenis" | "$queryRaw">;

// Betaald en gecrediteerd (definitieve creditnota's, positief) van een factuur.
export async function laadStand(db: Db, factuurId: string): Promise<BetalingsStand & { status: string; verstuurd: boolean }> {
  const f = await db.factuur.findUniqueOrThrow({
    where: { id: factuurId },
    select: { status: true, verstuurdOp: true, totaalInclCenten: true, betalingen: { select: { bedragCenten: true } }, creditnotas: { where: { status: { not: "CONCEPT" } }, select: { totaalInclCenten: true } } },
  });
  return {
    status: f.status,
    verstuurd: f.verstuurdOp !== null,
    totaalInclCenten: f.totaalInclCenten,
    betaaldCenten: f.betalingen.reduce((s, b) => s + b.bedragCenten, 0),
    gecrediteerdCenten: f.creditnotas.reduce((s, c) => s - c.totaalInclCenten, 0),
  };
}

// Zet de status van de factuur in lijn met betalingen en creditnota's.
export async function herberekenFactuurStatus(db: Db, factuurId: string): Promise<void> {
  const s = await laadStand(db, factuurId);
  if (s.status === "CONCEPT") return;
  const nieuw = statusNaMutatie(s.status as Parameters<typeof statusNaMutatie>[0], s, s.verstuurd);
  if (nieuw !== s.status) await db.factuur.update({ where: { id: factuurId }, data: { status: nieuw } });
}

const vergrendel = (tx: Db, id: string, companyId: string) => tx.$queryRaw`SELECT "id" FROM "Factuur" WHERE "id" = ${id} AND "companyId" = ${companyId} FOR UPDATE`;

export async function registreerBetaling(
  db: PrismaClient,
  { factuurId, companyId, bedragCenten, datum, methode = "OVERBOEKING", notitie }: { factuurId: string; companyId: string; bedragCenten: number; datum: string; methode?: "OVERBOEKING" | "CONTANT" | "PIN" | "BETAALLINK" | "OVERIG"; notitie?: string }
): Promise<void> {
  await db.$transaction(async (tx) => {
    await vergrendel(tx, factuurId, companyId);
    const s = await laadStand(tx, factuurId);
    const fout = valideerBetaling({ bedragCenten, datum }, s, s.status as Parameters<typeof valideerBetaling>[2]);
    if (fout) throw new BeheerFout(BETALING_FOUT_TEKST[fout]);
    await tx.factuurBetaling.create({ data: { factuurId, datum: new Date(`${datum}T00:00:00Z`), bedragCenten, methode, notitie: notitie?.trim() || null } });
    await tx.factuurGebeurtenis.create({ data: { factuurId, soort: "BETALING", bedragCenten, tekst: notitie?.trim() || null } });
    await herberekenFactuurStatus(tx, factuurId);
  });
}

// Een betaling die per ongeluk is geregistreerd mag worden verwijderd; dat staat in de tijdlijn.
export async function verwijderBetaling(db: PrismaClient, { betalingId, companyId }: { betalingId: string; companyId: string }): Promise<void> {
  await db.$transaction(async (tx) => {
    const b = await tx.factuurBetaling.findFirst({ where: { id: betalingId, factuur: { companyId } }, select: { id: true, factuurId: true, bedragCenten: true } });
    if (!b) throw new BeheerFout("Deze betaling bestaat niet meer.");
    await vergrendel(tx, b.factuurId, companyId);
    await tx.factuurBetaling.delete({ where: { id: b.id } });
    await tx.factuurGebeurtenis.create({ data: { factuurId: b.factuurId, soort: "NOTITIE", tekst: "Betaling verwijderd", bedragCenten: b.bedragCenten } });
    await herberekenFactuurStatus(tx, b.factuurId);
  });
}

// Concept-creditnota bij een definitieve factuur (geheel of voor geselecteerde regels). Samen mag er niet meer
// worden gecrediteerd dan de factuur groot is.
export async function maakCreditnotaConcept(
  db: PrismaClient,
  { factuurId, companyId, regelIds, instellingen }: { factuurId: string; companyId: string; regelIds?: string[]; instellingen: FactuurInstellingen }
): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    await vergrendel(tx, factuurId, companyId);
    const f = await tx.factuur.findFirst({ where: { id: factuurId, companyId }, select: { id: true, nummer: true, status: true, type: true, leadId: true, offerteId: true, offerteVersie: true, inhoud: true, totaalInclCenten: true, creditnotas: { select: { totaalInclCenten: true } } } });
    if (!f) throw new BeheerFout("Factuur niet gevonden.");
    if (f.status === "CONCEPT" || !f.nummer) throw new BeheerFout("Een concept hoef je niet te crediteren: pas hem aan of gooi hem weg.");
    if (f.type === "CREDITNOTA") throw new BeheerFout("Een creditnota kun je niet crediteren.");
    const inhoud = creditnotaUitFactuur({ nummer: f.nummer, inhoud: f.inhoud as unknown as FactuurInhoud }, instellingen, regelIds);
    if (inhoud.secties.length === 0) throw new BeheerFout("Kies minstens één regel om te crediteren.");
    const nieuw = -factuurTotalen(inhoud).totaalInclCenten;
    const bestaand = f.creditnotas.reduce((s, c) => s - c.totaalInclCenten, 0);
    if (bestaand + nieuw > f.totaalInclCenten) throw new BeheerFout("Er is al (een concept van) een creditnota voor dit bedrag; samen kun je niet meer crediteren dan de factuur groot is.");
    const c = await maakFactuurConcept(tx as unknown as PrismaClient, { companyId, leadId: f.leadId, offerteId: f.offerteId, offerteVersie: f.offerteVersie, inhoud, creditVoorId: f.id });
    await tx.factuurGebeurtenis.create({ data: { factuurId: f.id, soort: "CREDITNOTA", tekst: "Concept-creditnota aangemaakt" } });
    return c;
  });
}
