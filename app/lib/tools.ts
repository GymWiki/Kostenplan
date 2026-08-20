import type {
  ToolCtaType,
  ToolPrijsAfronding,
  ToolPrijsWeergave,
  ToolStatus,
} from "@/app/generated/prisma/client";

export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  CONCEPT: "Concept",
  GEPUBLICEERD: "Gepubliceerd",
  GEPAUZEERD: "Gepauzeerd",
};

export const CTA_LABELS: Record<ToolCtaType, string> = {
  OFFERTE_AANVRAGEN: "Offerte aanvragen",
  AANVRAAG_VERSTUREN: "Aanvraag versturen",
  CONTACT_OPNEMEN: "Contact opnemen",
  BEL_MIJ: "Bel mij",
  WHATSAPP: "WhatsApp",
  AFSPRAAK_MAKEN: "Afspraak maken",
};

export const PRIJS_WEERGAVE_LABELS: Record<ToolPrijsWeergave, string> = {
  EXACT: "Exacte prijs",
  VANAF: "Vanafprijs",
  RANGE: "Prijsrange",
  GEEN: "Geen prijs tonen",
};

export const PRIJS_AFRONDING_LABELS: Record<ToolPrijsAfronding, string> = {
  GEEN: "Geen afronding",
  HEEL_EURO: "Hele euro's",
  VIJF_EURO: "Op €5",
  TIEN_EURO: "Op €10",
};

// Resultaatinstellingen (Deel 23 van de opdracht) — bewust als Json op
// Tool.resultaatConfig opgeslagen i.p.v. losse kolommen, zelfde patroon als
// Product.sjabloonConfig: houdt dit uitbreidbaar richting Levering B zonder
// telkens een schema-migratie. parseResultaatConfig() vult ontbrekende
// velden aan met de default (EXACT/GEEN afronding/Offerte aanvragen) — het
// gedrag van elke bestaande tool vóór Levering A.
export type ToolResultaatConfig = {
  prijsWeergave: ToolPrijsWeergave;
  afronding: ToolPrijsAfronding;
  ctaType: ToolCtaType;
  ctaTekst: string | null;
  toelichting: string | null;
};

export const DEFAULT_RESULTAAT_CONFIG: ToolResultaatConfig = {
  prijsWeergave: "EXACT",
  afronding: "GEEN",
  ctaType: "OFFERTE_AANVRAGEN",
  ctaTekst: null,
  toelichting: null,
};

export function parseResultaatConfig(json: unknown): ToolResultaatConfig {
  const raw = (json && typeof json === "object" ? json : {}) as Partial<ToolResultaatConfig>;
  return { ...DEFAULT_RESULTAAT_CONFIG, ...raw };
}

export function applyPrijsAfronding(bedrag: number, afronding: ToolPrijsAfronding): number {
  switch (afronding) {
    case "HEEL_EURO":
      return Math.round(bedrag);
    case "VIJF_EURO":
      return Math.round(bedrag / 5) * 5;
    case "TIEN_EURO":
      return Math.round(bedrag / 10) * 10;
    default:
      return bedrag;
  }
}

// Aanvraagformulier (Deel 24 van de opdracht) — naam/e-mail zijn altijd
// verplicht (Lead.naam/Lead.email zijn niet-nullable), telefoon en de rest
// zijn per tool aan/uit te zetten. Zelfde Json-op-Tool-patroon als hierboven.
export type ToolLeadFormConfig = {
  vraagTelefoon: boolean;
  vraagAdres: boolean;
  vraagPostcode: boolean;
  vraagHuisnummer: boolean;
  vraagOpmerking: boolean;
};

export const DEFAULT_LEAD_FORM_CONFIG: ToolLeadFormConfig = {
  vraagTelefoon: true,
  vraagAdres: false,
  vraagPostcode: false,
  vraagHuisnummer: false,
  vraagOpmerking: true,
};

export function parseLeadFormConfig(json: unknown): ToolLeadFormConfig {
  const raw = (json && typeof json === "object" ? json : {}) as Partial<ToolLeadFormConfig>;
  return { ...DEFAULT_LEAD_FORM_CONFIG, ...raw };
}

// Embedinstellingen (Deel 27 van de opdracht) — zelfde Json-op-Tool-patroon.
export type ToolEmbedConfig = {
  breedte: "VOLLEDIG" | "VAST";
  vasteBreedtePx: number;
  minimaleHoogtePx: number;
  transparanteAchtergrond: boolean;
  toonBorder: boolean;
  radiusPx: number;
};

export const DEFAULT_EMBED_CONFIG: ToolEmbedConfig = {
  breedte: "VOLLEDIG",
  vasteBreedtePx: 480,
  minimaleHoogtePx: 600,
  transparanteAchtergrond: false,
  toonBorder: true,
  radiusPx: 12,
};

export function parseEmbedConfig(json: unknown): ToolEmbedConfig {
  const raw = (json && typeof json === "object" ? json : {}) as Partial<ToolEmbedConfig>;
  return { ...DEFAULT_EMBED_CONFIG, ...raw };
}

// Account-defaults-cascade (Deel 4/24/25 van de opdracht): elke
// CostSettings-rij bevat altijd een concrete arbeidTariefUur/voorrijTarief/
// btwPercentage, maar de daadwerkelijk GEBRUIKTE waarde is de company-brede
// standaard zolang gebruiktAccount*=true staat. Nooit de kolomwaarde
// rechtstreeks lezen in berekeningen/weergave — altijd via deze resolver,
// zodat "Gebruik accountinstelling" en "Eigen waarde" nergens los van elkaar
// kunnen raken.
type ResolveerbareCostSettings = {
  gebruiktAccountArbeidTarief: boolean;
  arbeidTariefUur: number;
  gebruiktAccountVoorrijTarief: boolean;
  voorrijTarief: number;
  gebruiktAccountBtw: boolean;
  btwPercentage: number;
};

export type AccountDefaults = {
  standaardArbeidTariefUur: number;
  standaardVoorrijTarief: number;
  standaardBtwPercentage: number;
};

export function resolveCostSettings<T extends ResolveerbareCostSettings>(
  costSettings: T,
  account: AccountDefaults
): T {
  return {
    ...costSettings,
    arbeidTariefUur: costSettings.gebruiktAccountArbeidTarief
      ? account.standaardArbeidTariefUur
      : costSettings.arbeidTariefUur,
    voorrijTarief: costSettings.gebruiktAccountVoorrijTarief
      ? account.standaardVoorrijTarief
      : costSettings.voorrijTarief,
    btwPercentage: costSettings.gebruiktAccountBtw
      ? account.standaardBtwPercentage
      : costSettings.btwPercentage,
  };
}
