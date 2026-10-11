import type { SubscriptionTier } from "@/app/generated/prisma/client";
import type { ProductWithDetails } from "@/app/portaal/[slug]/calculator";
import type { Branding, CostSettings } from "@/app/generated/prisma/client";
import type { AnyCalculatorConfigData } from "@/app/lib/calculator-engine/modulair-types";

// Versie van de vorm van het snapshot-bestand zelf. Ophogen bij een
// onverenigbare wijziging; de embed weigert (en valt terug) bij een hogere
// versie dan hij kent, zodat een oud script nooit een onbekend bestand rekent.
export const SNAPSHOT_SCHEMA_VERSIE = 1;

export type MateriaalOpties = Record<string, { id: string; naam: string; prijs: number }[]>;

// Eén zelfstandig, publiek bestand met alles wat de rekentool nodig heeft om
// te rekenen en te tonen. Bewust zonder database-interne gegevens: geen
// bedrijfs-id, geen betaalgegevens, geen inlog-e-mailadres (tenzij de
// hovenier dat zelf op de rekentool toont), geen tijdstempels van rijen.
export type RekentoolSnapshot = {
  schemaVersie: number;
  // Oplopend nummer per tool; zit ook in het onveranderlijke bestandspad.
  versie: number;
  gepubliceerdOp: string;
  // Hash van de inhoud zonder versie/datum: gelijke inhoud = niet opnieuw publiceren.
  inhoudHash: string;
  toolId: string;
  beschikbaar: boolean;
  bedrijf: {
    naam: string;
    // Alleen wat de hovenier zelf op zijn rekentool toont.
    telefoon: string | null;
    email: string | null;
  };
  tier: SubscriptionTier;
  soort: "klassiek" | "engine";
  branding: Branding | null;
  costSettings: CostSettings;
  producten: ProductWithDetails[];
  toelichting: string | null;
  ctaTekst: string | null;
  vraagTelefoon: boolean;
  engine: {
    config: AnyCalculatorConfigData;
    materiaalOpties: MateriaalOpties;
  } | null;
};
