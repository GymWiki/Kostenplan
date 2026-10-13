import { openstaandCenten } from "@/app/lib/factuur/betaling";
import { bepaalFase, volgendeActie, type FaseUitkomst, type LeadFactuur, type VolgendeActie } from "@/app/lib/lead-fase";
import { formatWeek } from "@/app/lib/offerte/weergave";
import type { FactuurGebeurtenisSoort, FactuurStatus, FactuurType, LeadStatus, OfferteGebeurtenisSoort, OfferteV2Status } from "@/app/generated/prisma/client";

// Alles wat de leadlijst en het leaddetail nodig hebben aan voortgang: fase, volgende actie en tijdlijn.
// Wordt op de server berekend uit de offerte, de facturen en de handmatige stappen (niets wordt apart opgeslagen).

export type TijdlijnItem = { tijdstip: Date; tekst: string; href?: string };

export type LeadVoortgang = FaseUitkomst & {
  actie: VolgendeActie;
  facturen: LeadFactuur[];
  offerteId: string | null;
  tijdlijn: TijdlijnItem[];
};

export type VoortgangBron = {
  id: string;
  createdAt: Date;
  status: LeadStatus;
  inContactOp: Date | null;
  ingeplandStartweek: string | null;
  opgeleverdOp: Date | null;
  verlorenReden: string | null;
  gebeurtenissen: { soort: string; tekst: string | null; createdAt: Date }[];
  offertesV2: { id: string; status: OfferteV2Status; geldigTot: Date | null; gebeurtenissen?: { soort: OfferteGebeurtenisSoort; tekst: string | null; createdAt: Date }[] }[];
  facturen: {
    id: string;
    nummer: string | null;
    type: FactuurType;
    status: FactuurStatus;
    totaalInclCenten: number;
    vervaldatum: Date | null;
    inhoud: unknown;
    betalingen: { bedragCenten: number }[];
    creditnotas: { status: FactuurStatus; totaalInclCenten: number }[];
    gebeurtenissen?: { soort: FactuurGebeurtenisSoort; tekst: string | null; bedragCenten: number | null; createdAt: Date }[];
  }[];
};

const euro = (c: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(c / 100);

const OFFERTE_TEKST: Partial<Record<OfferteGebeurtenisSoort, string>> = {
  VERZONDEN: "Offerte verstuurd",
  BEKEKEN: "Klant bekeek de offerte",
  VRAAG: "Klant stelde een vraag over de offerte",
  AKKOORD: "Klant ging akkoord met de offerte",
  AFGEWEZEN: "Klant wees de offerte af",
  INGETROKKEN: "Offerte ingetrokken",
  HERINNERING: "Herinnering voor de offerte verstuurd",
};
const FACTUUR_TEKST: Partial<Record<FactuurGebeurtenisSoort, string>> = {
  DEFINITIEF: "Factuur {n} gemaakt",
  VERZONDEN: "Factuur {n} verstuurd",
  BEKEKEN: "Klant bekeek factuur {n}",
  BETALING: "Betaling ontvangen op factuur {n}",
  HERINNERING: "Herinnering voor factuur {n} verstuurd",
  AANMANING: "Aanmaning voor factuur {n} verstuurd",
  LAATSTE_HERINNERING: "Laatste herinnering voor factuur {n} verstuurd",
};

function lidTekst(soort: string, tekst: string | null): string | null {
  switch (soort) {
    case "IN_CONTACT":
      return "Op In contact gezet";
    case "INGEPLAND":
      return `Ingepland${tekst ? `: ${formatWeek(tekst)}` : ""}`;
    case "OPGELEVERD":
      return `Opgeleverd${tekst ? ` op ${tekst}` : ""}`;
    case "VERLOREN":
      return `Verloren${tekst ? `: ${tekst}` : ""}`;
    case "HERSTELD":
      return "Weer opengezet";
    default:
      return null;
  }
}

export function factuurSoort(inhoud: unknown, type: FactuurType): string {
  if (type === "CREDITNOTA") return "creditnota";
  return (inhoud as { factuur?: { soort?: string } } | null)?.factuur?.soort ?? "factuur";
}

export function bouwVoortgang(l: VoortgangBron, nu: Date = new Date()): LeadVoortgang {
  const facturen: LeadFactuur[] = l.facturen.map((f) => {
    const betaald = f.betalingen.reduce((s, b) => s + b.bedragCenten, 0);
    const gecrediteerd = f.creditnotas.filter((c) => c.status !== "CONCEPT").reduce((s, c) => s - c.totaalInclCenten, 0);
    return {
      id: f.id,
      nummer: f.nummer,
      soort: factuurSoort(f.inhoud, f.type),
      status: f.status,
      totaalInclCenten: f.totaalInclCenten,
      openstaandCenten: f.type === "CREDITNOTA" || f.status === "CONCEPT" ? 0 : openstaandCenten({ totaalInclCenten: f.totaalInclCenten, betaaldCenten: betaald, gecrediteerdCenten: gecrediteerd }),
      vervaldatum: f.vervaldatum ? f.vervaldatum.toISOString().slice(0, 10) : null,
    };
  });
  const o = l.offertesV2[0] ?? null;
  const u = bepaalFase({ status: l.status, inContactOp: l.inContactOp, ingeplandStartweek: l.ingeplandStartweek, opgeleverdOp: l.opgeleverdOp, verlorenReden: l.verlorenReden, offerte: o ? { status: o.status, geldigTot: o.geldigTot } : null, facturen }, nu);

  const tijdlijn: TijdlijnItem[] = [{ tijdstip: l.createdAt, tekst: "Aanvraag ontvangen" }];
  for (const g of l.gebeurtenissen) {
    const t = lidTekst(g.soort, g.tekst);
    if (t) tijdlijn.push({ tijdstip: g.createdAt, tekst: t });
  }
  for (const g of o?.gebeurtenissen ?? []) {
    const t = OFFERTE_TEKST[g.soort];
    if (t) tijdlijn.push({ tijdstip: g.createdAt, tekst: g.soort === "AFGEWEZEN" && g.tekst ? `${t}: ${g.tekst}` : t, href: `/dashboard/leads/${l.id}/offerte` });
  }
  for (const f of l.facturen) {
    for (const g of f.gebeurtenissen ?? []) {
      const sjabloon = FACTUUR_TEKST[g.soort];
      if (!sjabloon || !f.nummer) continue;
      const tekst = sjabloon.replace("{n}", f.nummer) + (g.soort === "BETALING" && g.bedragCenten ? ` (${euro(g.bedragCenten)})` : "");
      tijdlijn.push({ tijdstip: g.createdAt, tekst, href: `/dashboard/facturen/${f.id}` });
    }
  }
  tijdlijn.sort((a, b) => a.tijdstip.getTime() - b.tijdstip.getTime());
  return { ...u, actie: volgendeActie(u, Boolean(o), facturen), facturen, offerteId: o?.id ?? null, tijdlijn };
}
