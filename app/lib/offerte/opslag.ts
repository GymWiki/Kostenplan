import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { berekenTotalen } from "./bereken";
import type { OfferteInhoud } from "./model";
import { volgendeOfferteNummer } from "./nummer";
import { isDefinitief, magNieuweVersie } from "./status";

// Opslag van offertes met versies. Functies krijgen de database mee zodat ze
// zowel in de app als in tests tegen een echte database draaien.

export class OfferteVergrendeldFout extends Error {
  constructor() {
    super("Deze versie is verstuurd en kan niet meer worden gewijzigd. Maak een nieuwe versie.");
  }
}

export const nieuweToken = () => randomBytes(24).toString("base64url");

function totalenVan(inhoud: OfferteInhoud) {
  const t = berekenTotalen(inhoud);
  return { totaalExclCenten: t.totaalExcl, totaalInclCenten: t.totaalIncl };
}

export async function maakOfferte(
  db: PrismaClient,
  { companyId, leadId, prefix, bouw }: { companyId: string; leadId: string | null; prefix: string; bouw: (nummer: string) => OfferteInhoud }
): Promise<{ id: string; nummer: string }> {
  return db.$transaction(async (tx) => {
    const { nummer } = await volgendeOfferteNummer(tx as unknown as Parameters<typeof volgendeOfferteNummer>[0], companyId, prefix);
    const inhoud = bouw(nummer);
    const o = await tx.offerteV2.create({
      data: {
        companyId,
        leadId,
        nummer,
        token: nieuweToken(),
        versies: { create: { versie: 1, inhoud: inhoud as object, ...totalenVan(inhoud) } },
      },
      select: { id: true },
    });
    return { id: o.id, nummer };
  });
}

// Slaat de inhoud van de huidige versie op — alleen zolang die niet is verstuurd.
export async function bewaarConcept(db: PrismaClient, { offerteId, companyId, inhoud }: { offerteId: string; companyId: string; inhoud: OfferteInhoud }) {
  const o = await db.offerteV2.findFirst({ where: { id: offerteId, companyId }, select: { huidigeVersie: true, status: true } });
  if (!o) throw new Error("Offerte niet gevonden.");
  if (isDefinitief(o.status)) throw new OfferteVergrendeldFout();
  const r = await db.offerteVersie.updateMany({
    where: { offerteId, versie: o.huidigeVersie, vergrendeld: false },
    // Een wijziging maakt een eerder klaargezette PDF ongeldig: die wordt opnieuw gemaakt bij het delen.
    data: { inhoud: { ...inhoud, versie: o.huidigeVersie } as object, ...totalenVan(inhoud), pdfData: null, pdfHash: null },
  });
  if (r.count === 0) throw new OfferteVergrendeldFout();
}

// Wijzigen na versturen: maakt een nieuwe versie (concept) op basis van de laatste.
export async function maakNieuweVersie(db: PrismaClient, { offerteId, companyId }: { offerteId: string; companyId: string }): Promise<number> {
  return db.$transaction(async (tx) => {
    const o = await tx.offerteV2.findFirst({ where: { id: offerteId, companyId }, include: { versies: { orderBy: { versie: "desc" }, take: 1 } } });
    if (!o) throw new Error("Offerte niet gevonden.");
    const laatste = o.versies[0];
    if (!laatste.vergrendeld) return laatste.versie; // er is al een concept
    if (!magNieuweVersie(o.status)) throw new OfferteVergrendeldFout();
    const versie = laatste.versie + 1;
    const inhoud = { ...(laatste.inhoud as unknown as OfferteInhoud), versie };
    await tx.offerteVersie.create({ data: { offerteId, versie, inhoud: inhoud as object, ...totalenVan(inhoud) } });
    await tx.offerteV2.update({ where: { id: offerteId }, data: { huidigeVersie: versie } });
    return versie;
  });
}

// Zet de PDF van een (nog niet verstuurde) versie klaar om te delen. Zolang de versie niet is
// vergrendeld kan de klant hem al bekijken via de link, maar elke wijziging wist de PDF weer.
export async function bewaarDeelklaarPdf(db: PrismaClient, { offerteId, versie, pdf, pdfHash }: { offerteId: string; versie: number; pdf: Buffer; pdfHash: string }) {
  const r = await db.offerteVersie.updateMany({ where: { offerteId, versie, vergrendeld: false }, data: { pdfData: new Uint8Array(pdf), pdfHash } });
  if (r.count === 0) throw new OfferteVergrendeldFout();
}

// Vergrendelt een klaargezette versie (zodra de hovenier bevestigt dat hij is verstuurd, of de klant
// akkoord geeft). Mislukt als hij al vergrendeld is of geen PDF heeft.
export async function vergrendelVersie(db: PrismaClient, { offerteId, versie }: { offerteId: string; versie: number }) {
  const r = await db.offerteVersie.updateMany({ where: { offerteId, versie, vergrendeld: false, pdfHash: { not: null } }, data: { vergrendeld: true, verstuurdOp: new Date() } });
  if (r.count === 0) throw new OfferteVergrendeldFout();
}
