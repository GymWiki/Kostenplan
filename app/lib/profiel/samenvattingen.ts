import type { MollieSubscriptionStatus, SubscriptionTier } from "@/app/generated/prisma/client";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";

// Teksten voor de regels op Profiel → Bedrijf. Alleen weergave: de gegevens komen ongewijzigd uit de database.

const PLAN_NAAM: Record<SubscriptionTier, string> = { GRATIS: "Gratis", PLUS: "Plus", PRO: "Pro" };
const datum = (d: Date) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" }).format(d);

export type AbonnementRegel = {
  tekst: string;
  // Oranje markering (opgezegd, betaling mislukt).
  letOp: boolean;
  // Opzeggen kan niet ongedaan gemaakt worden bij Mollie: dan is opnieuw abonneren de weg terug.
  opnieuwAbonneren: boolean;
};

export function abonnementRegel(a: {
  plan: SubscriptionTier;
  handmatigToegekend: boolean;
  status: MollieSubscriptionStatus;
  periodeEind: Date | null;
  gepauzeerdTot: Date | null;
  gebruikteOnderdelen: number;
  limietOnderdelen: number | null;
  nu?: Date;
}): AbonnementRegel {
  const nu = a.nu ?? new Date();
  const naam = PLAN_NAAM[a.plan];
  if (a.handmatigToegekend) return { tekst: `${naam} · handmatig toegekend`, letOp: false, opnieuwAbonneren: false };
  if (a.plan === "GRATIS") {
    const gebruikt = a.limietOnderdelen === null ? `${a.gebruikteOnderdelen} onderdelen` : `${a.gebruikteOnderdelen} van ${a.limietOnderdelen} onderdelen`;
    return { tekst: `Gratis · ${gebruikt}`, letOp: false, opnieuwAbonneren: false };
  }
  if (a.status === "CANCELED") {
    if (a.gepauzeerdTot && a.gepauzeerdTot > nu) return { tekst: `${naam} tot ${datum(a.gepauzeerdTot)}, daarna Gratis`, letOp: true, opnieuwAbonneren: true };
    return { tekst: `${naam} · opgezegd`, letOp: true, opnieuwAbonneren: true };
  }
  if (a.status === "SUSPENDED") return { tekst: `${naam} · betaling mislukt`, letOp: true, opnieuwAbonneren: false };
  if (a.status === "PENDING") return { tekst: `${naam} · betaling wordt verwerkt`, letOp: false, opnieuwAbonneren: false };
  if (a.status === "ACTIVE") return { tekst: a.periodeEind ? `${naam} · verlengt op ${datum(a.periodeEind)}` : `${naam} · actief`, letOp: false, opnieuwAbonneren: false };
  return { tekst: naam, letOp: false, opnieuwAbonneren: false };
}

// Bedragen zonder ",00": "€ 45", "€ 45,50".
export const bedrag = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return `€ ${Number.isInteger(r) ? String(r) : r.toFixed(2).replace(".", ",")}`;
};

const EENHEID_WOORD = { UUR: "uur", DAGDEEL: "dagdeel", DAG: "dag" } as const;

// "€ 45 per uur · voorrijkosten € 35"
export function tarievenRegel(t: { eenheid: keyof typeof EENHEID_WOORD; tarief: number; voorrij: number }): string {
  return `${bedrag(t.tarief)} per ${EENHEID_WOORD[t.eenheid]} · voorrijkosten ${bedrag(t.voorrij)}`;
}

// "6 gegevens ontbreken voor offertes", of null als alles compleet is.
export function ontbreektTekst(aantal: number): string | null {
  return aantal === 0 ? null : `${aantal} ${aantal === 1 ? "gegeven ontbreekt" : "gegevens ontbreken"} voor offertes`;
}

// "25 km rond Zwolle · vanaf €250", "Postcodegebieden", "Uit".
export function werkgebiedRegel(i: WerkgebiedInstellingen): string {
  const delen: string[] = [];
  const w = i.werkgebied;
  if (w.aan) {
    if (w.methode === "STRAAL") delen.push(`${String(w.straalKm).replace(".", ",")} km${w.start?.plaats ? ` rond ${w.start.plaats}` : ""}`);
    else delen.push("Postcodegebieden");
  }
  if (i.minimum.aan) delen.push(`vanaf ${bedrag(i.minimum.bedragEuro)}`);
  return delen.length ? delen.join(" · ") : "Uit";
}

// "dennenlaan.nl" uit "https://www.dennenlaan.nl/contact".
export function domeinVan(website: string | null | undefined): string | null {
  const t = (website ?? "").trim();
  if (!t) return null;
  try {
    const host = new URL(/^[a-z]+:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

export function initialen(naam: string): string {
  const woorden = naam.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (woorden.length === 0) return "?";
  return (woorden.length === 1 ? woorden[0].slice(0, 2) : woorden[0][0] + woorden[1][0]).toUpperCase();
}
