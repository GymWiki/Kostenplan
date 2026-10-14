import { createHash } from "node:crypto";
import { resolveCostSettings, parseLeadFormConfig, parseResultaatConfig } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { isActief, resolveWerkgebied } from "@/app/lib/werkgebied/schema";
import { parseWeergaveConfig, STANDAARD_WEERGAVE_CONFIG } from "@/app/lib/weergave/config";
import { parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine";
import type { getToolForSnapshot } from "@/app/lib/dal";
import { SNAPSHOT_SCHEMA_VERSIE, type MateriaalOpties, type RekentoolSnapshot } from "./types";

export type EmbedToolRij = NonNullable<Awaited<ReturnType<typeof getToolForSnapshot>>>;

// Rij-metadata die de rekentool nooit nodig heeft en die niet in een publiek
// bestand hoort. (Rij-id's blijven staan: de rekentool gebruikt ze als sleutel
// en ze zijn zonder database niets waard.)
const WEG = new Set(["createdAt", "updatedAt", "deletedAt", "companyId", "toolId", "importSleutel"]);

// JSON-roundtrip: Date -> ISO-tekst, undefined weg, en de WEG-sleutels eruit.
export function zuiver<T>(waarde: T): T {
  return JSON.parse(JSON.stringify(waarde, (sleutel, v) => (WEG.has(sleutel) ? undefined : v))) as T;
}

// Pure functie: bouwt het snapshot-object uit de database-rij. `versie` en
// `gepubliceerdOp` worden pas bij het publiceren ingevuld (hash eronder).
export function bouwSnapshotInhoud(
  tool: EmbedToolRij,
  materiaalOpties: MateriaalOpties
): Omit<RekentoolSnapshot, "versie" | "gepubliceerdOp" | "inhoudHash"> {
  const kosten = tool.costSettings ? resolveCostSettings(tool.costSettings, tool.company) : null;
  const resultaat = parseResultaatConfig(tool.resultaatConfig);
  const branding = tool.branding;
  const werkgebied = resolveWerkgebied(tool.company.werkgebied, tool.werkgebied);
  const weergave = parseWeergaveConfig(tool.weergaveConfig);
  // De tip voor de hovenier hoort niet in het publieke bestand.
  const { tip: _tip, ...publiekeWeergave } = weergave;
  const { tip: _standaardTip, ...standaardWeergave } = STANDAARD_WEERGAVE_CONFIG;
  void _tip;
  void _standaardTip;
  const weergaveIsStandaard = JSON.stringify(publiekeWeergave) === JSON.stringify(standaardWeergave);
  const engineConfig = tool.activeCalculatorConfig
    ? publicCalculatorConfig(parseCalculatorConfig(tool.activeCalculatorConfig.config))
    : null;

  return {
    schemaVersie: SNAPSHOT_SCHEMA_VERSIE,
    toolId: tool.id,
    beschikbaar: tool.status === "GEPUBLICEERD" && !tool.deletedAt && kosten !== null,
    bedrijf: {
      naam: tool.company.naam,
      telefoon: branding?.toonTelefoonnummer ? (branding.telefoonnummer ?? null) : null,
      email: branding?.toonEmail ? tool.company.creator.email : null,
    },
    tier: effectiveTier(tool.company),
    soort: engineConfig ? "engine" : "klassiek",
    branding: branding ? zuiver(branding) : null,
    // Zonder kosteninstellingen is er niets te rekenen; "beschikbaar" is dan
    // onwaar en de rest blijft leeg maar geldig.
    costSettings: zuiver(kosten ?? ({} as NonNullable<typeof kosten>)),
    producten: engineConfig ? [] : zuiver(tool.products),
    toelichting: resultaat.toelichting ?? null,
    ctaTekst: resultaat.ctaTekst ?? null,
    vraagTelefoon: parseLeadFormConfig(tool.leadFormConfig).vraagTelefoon,
    engine: engineConfig ? { config: engineConfig, materiaalOpties } : null,
    ...(isActief(werkgebied) ? { werkgebied } : {}),
    ...(weergaveIsStandaard ? {} : { weergave: publiekeWeergave }),
  };
}

export function hashInhoud(inhoud: unknown): string {
  return createHash("sha256").update(JSON.stringify(inhoud)).digest("hex").slice(0, 16);
}

export function maakSnapshot(
  inhoud: ReturnType<typeof bouwSnapshotInhoud>,
  versie: number,
  nu: Date
): RekentoolSnapshot {
  return { ...inhoud, versie, gepubliceerdOp: nu.toISOString(), inhoudHash: hashInhoud(inhoud) };
}
