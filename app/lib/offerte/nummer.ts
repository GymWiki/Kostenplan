import { formatteerOfferteNummer } from "./nummer-formaat";

type RawClient = { $queryRaw: (strings: TemplateStringsArray, ...waarden: unknown[]) => Promise<unknown> };

// Geeft het volgende offertenummer van een bedrijf voor dit jaar. Eén atomaire
// INSERT … ON CONFLICT DO UPDATE … RETURNING: twee gelijktijdige aanvragen
// krijgen nooit hetzelfde volgnummer, en een nummer wordt nooit hergebruikt
// (ook niet als de offerte daarna wordt verwijderd — de teller loopt alleen op).
export async function volgendeOfferteNummer(db: RawClient, companyId: string, prefix: string, nu: Date = new Date()): Promise<{ nummer: string; jaar: number; volgnummer: number }> {
  const jaar = nu.getFullYear();
  const rijen = (await db.$queryRaw`
    INSERT INTO "OfferteNummerTeller" ("companyId", "jaar", "laatste")
    VALUES (${companyId}, ${jaar}, 1)
    ON CONFLICT ("companyId", "jaar") DO UPDATE SET "laatste" = "OfferteNummerTeller"."laatste" + 1
    RETURNING "laatste"
  `) as { laatste: number }[];
  const volgnummer = Number(rijen[0].laatste);
  return { nummer: formatteerOfferteNummer(prefix, jaar, volgnummer), jaar, volgnummer };
}
