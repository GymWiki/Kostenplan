import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/app/generated/prisma/client";
import type { OfferteAfzender } from "@/app/lib/offerte/model";
import { controleerFactuur, type FactuurControlePunt } from "./controle";
import { reeksVan, SOORT_NAAR_TYPE, type FactuurInhoud } from "./model";
import { volgendeFactuurNummer } from "./nummer";
import { factuurTotalen } from "./totalen";

// Opslag van facturen. Functies krijgen de database mee zodat ze in de app en in tests tegen een echte database draaien.
// Een factuur is een concept tot hij definitief wordt; daarna is hij onveranderlijk (hier én met een trigger in de database).

export class FactuurVergrendeldFout extends Error {
  constructor() {
    super("Deze factuur is definitief en kan niet meer worden gewijzigd of verwijderd. Maak een creditnota om te corrigeren.");
  }
}
export class FactuurRevisieConflictFout extends Error {
  constructor(public huidigeRevisie: number) {
    super("Deze factuur is in een ander tabblad of door iemand anders gewijzigd.");
  }
}
export class FactuurControleFout extends Error {
  constructor(public punten: FactuurControlePunt[]) {
    super(punten[0]?.bericht ?? "De factuur kan nog niet definitief worden.");
  }
}

export const nieuweFactuurToken = () => randomBytes(24).toString("base64url");
const dag = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : null);

// De kolommen die uit de inhoud volgen (zodat zoeken, filteren en exporteren niet in de JSON hoeft).
function kolommen(inhoud: FactuurInhoud) {
  const t = factuurTotalen(inhoud);
  const f = inhoud.factuur;
  return {
    type: SOORT_NAAR_TYPE[f.soort],
    reeks: reeksVan(f.soort),
    factuurdatum: dag(f.factuurdatum),
    vervaldatum: dag(f.vervaldatum),
    uitvoeringVan: dag(f.uitvoeringVan),
    uitvoeringTot: dag(f.uitvoeringTot),
    betaallink: f.betaallink.trim() || null,
    totaalExclCenten: t.totaalExclCenten,
    totaalBtwCenten: t.totaalBtwCenten,
    totaalInclCenten: t.totaalInclCenten,
  };
}

export async function maakFactuurConcept(
  db: PrismaClient,
  { companyId, leadId, offerteId, offerteVersie, inhoud, creditVoorId }: { companyId: string; leadId: string | null; offerteId: string | null; offerteVersie: number | null; inhoud: FactuurInhoud; creditVoorId?: string | null }
): Promise<{ id: string }> {
  const f = await db.factuur.create({
    data: {
      companyId,
      leadId,
      offerteId,
      offerteVersie,
      creditVoorId: creditVoorId ?? null,
      token: nieuweFactuurToken(),
      inhoud: { ...inhoud, nummer: "", factuur: { ...inhoud.factuur, nummer: null } } as object,
      ...kolommen(inhoud),
      gebeurtenissen: { create: { soort: "AANGEMAAKT" } },
    },
    select: { id: true },
  });
  return f;
}

// Slaat het concept op — alleen zolang de factuur een concept is.
// Met `verwachteRevisie` (de editor stuurt die altijd mee) wordt een opslag op een verouderde stand geweigerd. Geeft de nieuwe revisie terug.
export async function bewaarFactuurConcept(db: PrismaClient, { factuurId, companyId, inhoud, notities, verwachteRevisie }: { factuurId: string; companyId: string; inhoud: FactuurInhoud; notities?: string | null; verwachteRevisie?: number }): Promise<number> {
  const r = await db.factuur.updateMany({
    where: { id: factuurId, companyId, status: "CONCEPT", ...(verwachteRevisie !== undefined ? { revisie: verwachteRevisie } : {}) },
    data: { inhoud: { ...inhoud, nummer: "", factuur: { ...inhoud.factuur, nummer: null } } as object, ...kolommen(inhoud), ...(notities !== undefined ? { notities } : {}), revisie: { increment: 1 } },
  });
  if (r.count === 0) {
    const nu = await db.factuur.findFirst({ where: { id: factuurId, companyId }, select: { status: true, revisie: true } });
    if (nu && nu.status === "CONCEPT" && verwachteRevisie !== undefined && nu.revisie !== verwachteRevisie) throw new FactuurRevisieConflictFout(nu.revisie);
    throw new FactuurVergrendeldFout();
  }
  return (await db.factuur.findFirstOrThrow({ where: { id: factuurId, companyId }, select: { revisie: true } })).revisie;
}

// Een concept mag worden weggegooid (het had nog geen nummer, dus er ontstaat geen gat); een definitieve factuur nooit.
export async function verwijderFactuurConcept(db: PrismaClient, { factuurId, companyId }: { factuurId: string; companyId: string }) {
  const r = await db.factuur.deleteMany({ where: { id: factuurId, companyId, status: "CONCEPT" } });
  if (r.count === 0) throw new FactuurVergrendeldFout();
}

// "Definitief maken", in één transactie: rij vergrendelen, controleren, nummer toekennen, snapshot van de bedrijfsgegevens,
// klant, regels en totalen vastleggen. Slaagt iets niet, dan wordt ook de nummerteller teruggedraaid.
export async function maakFactuurDefinitief(
  db: PrismaClient,
  { factuurId, companyId, afzender, prefix, nu = new Date() }: { factuurId: string; companyId: string; afzender: OfferteAfzender; prefix: { factuur: string; credit: string }; nu?: Date }
): Promise<{ nummer: string; inhoud: FactuurInhoud }> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Factuur" WHERE "id" = ${factuurId} AND "companyId" = ${companyId} FOR UPDATE`;
    const rij = await tx.factuur.findFirst({ where: { id: factuurId, companyId }, select: { status: true, inhoud: true } });
    if (!rij) throw new Error("Factuur niet gevonden.");
    if (rij.status !== "CONCEPT") throw new FactuurVergrendeldFout();

    // Snapshot: de bedrijfsgegevens van dit moment (huisstijl blijft zoals in de editor).
    let inhoud = rij.inhoud as unknown as FactuurInhoud;
    inhoud = { ...inhoud, afzender: { ...afzender, kleur: inhoud.afzender.kleur, lettertype: inhoud.afzender.lettertype } };
    const controle = controleerFactuur(inhoud, nu);
    if (controle.blokkerend.length > 0) throw new FactuurControleFout(controle.blokkerend);

    const f = inhoud.factuur;
    const jaar = Number(f.factuurdatum.slice(0, 4));
    const reeks = reeksVan(f.soort);
    const { nummer, volgnummer } = await volgendeFactuurNummer(tx as unknown as Parameters<typeof volgendeFactuurNummer>[0], companyId, reeks, reeks === "C" ? prefix.credit : prefix.factuur, jaar);
    inhoud = { ...inhoud, nummer, factuur: { ...f, nummer } };

    await tx.factuur.update({
      where: { id: factuurId },
      data: { status: "DEFINITIEF", nummer, jaar, volgnummer, definitiefOp: nu, inhoud: inhoud as object, ...kolommen(inhoud), gebeurtenissen: { create: { soort: "DEFINITIEF", tekst: `Nummer ${nummer}` } } },
    });
    return { nummer, inhoud };
  });
}

// De PDF van de definitieve factuur, eenmalig vast te leggen met zijn SHA-256 (daarna onveranderlijk).
export async function slaFactuurPdfOp(db: PrismaClient, { factuurId, companyId, pdf, pdfHash }: { factuurId: string; companyId: string; pdf: Buffer; pdfHash: string }): Promise<boolean> {
  const r = await db.factuur.updateMany({ where: { id: factuurId, companyId, status: { not: "CONCEPT" }, pdfData: null }, data: { pdfData: new Uint8Array(pdf), pdfHash } });
  return r.count === 1;
}
