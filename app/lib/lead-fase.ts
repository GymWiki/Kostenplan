import { dagenTeLaat } from "@/app/lib/factuur/betaling";
import type { FactuurStatus, LeadStatus, OfferteV2Status } from "@/app/generated/prisma/client";

// De fase van een lead, afgeleid uit wat er al is gebeurd (offerte, facturen, handmatige stappen). Niets hiervan wordt
// apart opgeslagen: de fase klopt dus altijd met de offerte en de facturen.
//
// Hoofdpad:  Nieuw → In contact → Offerte verstuurd → Akkoord → Ingepland → Opgeleverd → Gefactureerd → Betaald
// Zijpaden:  Offerte verlopen · Afgewezen (met reden) · Verloren (handmatig, met reden)

export type LeadFase =
  | "nieuw"
  | "in-contact"
  | "offerte-verstuurd"
  | "akkoord"
  | "ingepland"
  | "opgeleverd"
  | "gefactureerd"
  | "betaald"
  | "offerte-verlopen"
  | "afgewezen"
  | "verloren";

export const HOOFDPAD: LeadFase[] = ["nieuw", "in-contact", "offerte-verstuurd", "akkoord", "ingepland", "opgeleverd", "gefactureerd", "betaald"];

export const FASE_LABEL: Record<LeadFase, string> = {
  nieuw: "Nieuw",
  "in-contact": "In contact",
  "offerte-verstuurd": "Offerte verstuurd",
  akkoord: "Akkoord",
  ingepland: "Ingepland",
  opgeleverd: "Opgeleverd",
  gefactureerd: "Gefactureerd",
  betaald: "Betaald",
  "offerte-verlopen": "Offerte verlopen",
  afgewezen: "Afgewezen",
  verloren: "Verloren",
};

export type LeadFactuur = {
  id: string;
  nummer: string | null;
  soort: "factuur" | "termijn" | "eindfactuur" | "meerwerk" | "creditnota" | string;
  status: FactuurStatus;
  totaalInclCenten: number;
  openstaandCenten: number;
  vervaldatum: string | null;
};

export type FaseInvoer = {
  status: LeadStatus;
  inContactOp: Date | null;
  ingeplandStartweek: string | null;
  opgeleverdOp: Date | null;
  verlorenReden: string | null;
  offerte: { status: OfferteV2Status; geldigTot: Date | null } | null;
  facturen: LeadFactuur[];
};

export type FaseUitkomst = {
  fase: LeadFase;
  // Zijpad-toelichting, bijv. de reden van verlies.
  toelichting: string | null;
  // Akkoord of verder, maar nog geen definitieve (eind)factuur.
  teFactureren: boolean;
  openstaandCenten: number;
  teLaatCenten: number;
  teLaatDagen: number | null;
  // De factuur die nu aandacht vraagt (te laat, anders openstaand).
  aandachtFactuurId: string | null;
};

const definitief = (f: LeadFactuur) => f.status !== "CONCEPT";

export function bepaalFase(i: FaseInvoer, nu: Date = new Date()): FaseUitkomst {
  const o = i.offerte;
  const echt = i.facturen.filter((f) => f.soort !== "creditnota");
  const def = echt.filter(definitief);
  const openstaandCenten = def.reduce((s, f) => s + f.openstaandCenten, 0);
  const teLaat = def.map((f) => ({ f, dagen: dagenTeLaat({ vervaldatum: f.vervaldatum, status: f.status, openstaandCenten: f.openstaandCenten }, nu) })).filter((x) => x.dagen !== null);
  const teLaatDagen = teLaat.length ? Math.max(...teLaat.map((x) => x.dagen!)) : null;
  const aandacht = teLaat.sort((a, b) => b.dagen! - a.dagen!)[0]?.f ?? def.find((f) => f.openstaandCenten > 0) ?? null;

  const geaccepteerd = o?.status === "GEACCEPTEERD";
  // Een (eind)factuur voor het totaal: alleen termijnen/aanbetaling maken de lead nog niet "Gefactureerd".
  const eindDef = def.filter((f) => f.soort !== "termijn");
  const klaar = (fase: LeadFase, toelichting: string | null = null): FaseUitkomst => ({
    fase,
    toelichting,
    teFactureren: geaccepteerd && eindDef.length === 0 && fase !== "verloren" && fase !== "afgewezen",
    openstaandCenten,
    teLaatCenten: teLaat.reduce((s, x) => s + x.f.openstaandCenten, 0),
    teLaatDagen,
    aandachtFactuurId: aandacht?.id ?? null,
  });

  if (i.status === "VERLOREN" || i.verlorenReden) return klaar("verloren", i.verlorenReden);
  if (eindDef.length > 0) {
    const alleBetaald = eindDef.every((f) => f.status === "BETAALD" || f.status === "GECREDITEERD") && def.every((f) => f.openstaandCenten === 0);
    return klaar(alleBetaald ? "betaald" : "gefactureerd");
  }
  if (o?.status === "AFGEWEZEN") return klaar("afgewezen");
  if (geaccepteerd) {
    if (i.opgeleverdOp) return klaar("opgeleverd");
    if (i.ingeplandStartweek) return klaar("ingepland");
    return klaar("akkoord");
  }
  if (o?.status === "VERLOPEN" || ((o?.status === "VERSTUURD" || o?.status === "BEKEKEN") && o.geldigTot && o.geldigTot.getTime() < nu.getTime())) return klaar("offerte-verlopen");
  if (o && (o.status === "VERSTUURD" || o.status === "BEKEKEN")) return klaar("offerte-verstuurd");
  if (i.inContactOp || i.status === "IN_BEHANDELING" || o) return klaar("in-contact");
  return klaar("nieuw");
}

// De ene vervolgstap die de hovenier nu kan doen. `soort` bepaalt wat de knop doet.
export type VolgendeActie =
  | { soort: "in-contact"; label: string }
  | { soort: "offerte-maken"; label: string }
  | { soort: "offerte-openen"; label: string }
  | { soort: "inplannen"; label: string }
  | { soort: "opleveren"; label: string }
  | { soort: "factureren"; label: string }
  | { soort: "factuur-openen"; label: string; factuurId: string }
  | { soort: "herinneren"; label: string; factuurId: string }
  | null;

export function volgendeActie(u: FaseUitkomst, offerteAanwezig: boolean, facturen: LeadFactuur[] = []): VolgendeActie {
  const conceptFactuur = facturen.find((f) => f.status === "CONCEPT" && f.soort !== "creditnota");
  switch (u.fase) {
    case "nieuw":
      return { soort: "in-contact", label: "Zet op In contact" };
    case "in-contact":
      return offerteAanwezig ? { soort: "offerte-openen", label: "Open de offerte" } : { soort: "offerte-maken", label: "Maak een offerte" };
    case "offerte-verstuurd":
      return { soort: "offerte-openen", label: "Open de offerte" };
    case "offerte-verlopen":
      return { soort: "offerte-openen", label: "Open de offerte" };
    case "akkoord":
      return { soort: "inplannen", label: "Plan in" };
    case "ingepland":
      return { soort: "opleveren", label: "Zet op Opgeleverd" };
    case "opgeleverd":
      return conceptFactuur ? { soort: "factuur-openen", label: "Rond de factuur af", factuurId: conceptFactuur.id } : { soort: "factureren", label: "Maak een factuur" };
    case "gefactureerd":
      if (u.aandachtFactuurId) return u.teLaatDagen ? { soort: "herinneren", label: "Stuur een herinnering", factuurId: u.aandachtFactuurId } : { soort: "factuur-openen", label: "Open de factuur", factuurId: u.aandachtFactuurId };
      return null;
    default:
      return null;
  }
}

// Filterchips op de ledenlijst. Een lead kan onder meer dan één chip vallen.
export type FaseFilter = "alle" | "nieuw" | "offerte" | "akkoord" | "te-factureren" | "openstaand" | "te-laat" | "afgerond";
export const FASE_FILTERS: { waarde: FaseFilter; label: string }[] = [
  { waarde: "alle", label: "Alle" },
  { waarde: "nieuw", label: "Nieuw" },
  { waarde: "offerte", label: "Offerte" },
  { waarde: "akkoord", label: "Akkoord" },
  { waarde: "te-factureren", label: "Te factureren" },
  { waarde: "openstaand", label: "Openstaand" },
  { waarde: "te-laat", label: "Te laat" },
  { waarde: "afgerond", label: "Afgerond" },
];

export function valtOnderFilter(u: FaseUitkomst, f: FaseFilter): boolean {
  switch (f) {
    case "alle":
      return true;
    case "nieuw":
      return u.fase === "nieuw";
    case "offerte":
      return u.fase === "in-contact" || u.fase === "offerte-verstuurd";
    case "akkoord":
      // Alleen leads die nog ingepland moeten worden; ingepland en opgeleverd staan onder "Te factureren" zolang er geen eindfactuur is.
      return u.fase === "akkoord";
    case "te-factureren":
      return u.teFactureren;
    case "openstaand":
      return u.openstaandCenten > 0;
    case "te-laat":
      return u.teLaatDagen !== null;
    case "afgerond":
      return u.fase === "betaald" || u.fase === "verloren" || u.fase === "afgewezen" || u.fase === "offerte-verlopen";
  }
}

export const VERLOREN_REDENEN = ["Te duur", "Gekozen voor een andere hovenier", "Geen reactie meer", "Project gaat niet door", "Anders"] as const;
