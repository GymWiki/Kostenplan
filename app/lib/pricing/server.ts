import "server-only";
import { getMateriaalOptiesVoorEngineVelden, getToolForEmbed } from "@/app/lib/dal";
import { alleVeldenVanConfig, berekenModulair, bouwModulairSnapshot, parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import type { LeadSnapshot } from "@/app/lib/leads";
import { resolveCostSettings } from "@/app/lib/tools";
import { configVanProducten } from "./adapters";
import { berekenPrijs } from "./engine";
import { hashConfig } from "./hash";
import type { PricingConfig } from "./schema";

// De server rekent een aanvraag altijd zelf na met dezelfde rekenkern als de browser, uit de keuzes
// van de klant en de configuratie van dat moment. Het bedrag van de browser wordt nooit vertrouwd.

export type ServerConfig =
  | { soort: "onderdelen"; config: PricingConfig; configId: string | null }
  | { soort: "modulair"; config: ReturnType<typeof publicCalculatorConfig>; materiaalPrijzen: Record<string, number>; btwPercentage: number };

export async function laadPricingConfig(toolId: string): Promise<ServerConfig | null> {
  const tool = await getToolForEmbed(toolId);
  if (!tool || !tool.costSettings) return null;
  const kosten = resolveCostSettings(tool.costSettings, tool.company);
  if (tool.activeCalculatorConfig) {
    const config = publicCalculatorConfig(parseCalculatorConfig(tool.activeCalculatorConfig.config));
    const ids = alleVeldenVanConfig(config).filter((v) => v.soort === "PRODUCT_KEUZE").map((v) => v.materialCategoryId);
    const opties = await getMateriaalOptiesVoorEngineVelden(tool.id, ids);
    const materiaalPrijzen: Record<string, number> = {};
    for (const lijst of Object.values(opties)) for (const o of lijst) materiaalPrijzen[o.id] = o.prijs;
    return { soort: "modulair", config, materiaalPrijzen, btwPercentage: kosten.btwPercentage };
  }
  return { soort: "onderdelen", config: configVanProducten(tool.products, kosten), configId: tool.activeCalculatorConfigId ?? null };
}

export type Nagerekend = {
  snapshot: LeadSnapshot;
  // Wat de browser als totaal liet zien en wat de server berekende (centen incl. btw), alleen als ze verschillen.
  afwijking?: { klantCenten: number; serverCenten: number };
  // false: er kon niet nagerekend worden (oudere browser zonder invoer, of een ander type rekentool).
  nagerekend: boolean;
};

const topCenten = (r: { totaalInclCenten: number; bandbreedte?: unknown }): number => {
  const b = r.bandbreedte as { max?: { totaalInclCenten?: number } } | null | undefined;
  return typeof b?.max?.totaalInclCenten === "number" ? b.max.totaalInclCenten : r.totaalInclCenten;
};

function meldAfwijking(toolId: string, details: Record<string, unknown>) {
  console.warn("[prijs] servertotaal wijkt af van de browser", JSON.stringify({ toolId, ...details }));
}

export async function herberekenAanvraag(toolId: string, snapshot: LeadSnapshot): Promise<Nagerekend> {
  const invoer = snapshot.rekenkern?.invoer;
  const waarden = snapshot.modulair?.waarden;
  if (!invoer && !waarden) {
    console.warn("[prijs] aanvraag zonder invoer, niet nagerekend", JSON.stringify({ toolId, totaal: snapshot.totaal }));
    return { snapshot, nagerekend: false };
  }
  const cfg = await laadPricingConfig(toolId);
  if (!cfg) return { snapshot, nagerekend: false };

  // Formule-gebaseerde ("Aangepaste") rekentool: dezelfde berekening als de browser, uit de ingevulde waarden.
  if (cfg.soort === "modulair") {
    if (!waarden) return { snapshot, nagerekend: false };
    const berekening = berekenModulair({ config: cfg.config, waarden, materiaalPrijzen: cfg.materiaalPrijzen, btwPercentage: cfg.btwPercentage });
    const klantCenten = Math.round(snapshot.totaal * 100);
    const serverCenten = Math.round(berekening.resultaat.totaal * 100);
    const afwijking = klantCenten !== serverCenten ? { klantCenten, serverCenten } : undefined;
    if (afwijking) meldAfwijking(toolId, { ...afwijking, verschil: serverCenten - klantCenten, configHash: hashConfig(cfg.config), klantHash: snapshot.modulair?.configHash, waarden });
    return { snapshot: bouwModulairSnapshot({ config: cfg.config, waarden, berekening, bron: "server", afwijking }), afwijking, nagerekend: true };
  }

  if (!invoer) return { snapshot, nagerekend: false };
  const resultaat = berekenPrijs(cfg.config, invoer);
  if (!resultaat.heeftSelectie) {
    // De invoer past niet (meer) bij de rekentool: niets om te rekenen.
    console.warn("[prijs] invoer geeft geen selectie", JSON.stringify({ toolId }));
    return { snapshot, nagerekend: false };
  }
  const klantCenten = snapshot.rekenkern ? topCenten(snapshot.rekenkern.resultaat) : Math.round(snapshot.totaal * 100);
  const serverCenten = resultaat.bandbreedte ? resultaat.bandbreedte.max.totaalInclCenten : resultaat.totaalInclCenten;
  const afwijking = klantCenten !== serverCenten ? { klantCenten, serverCenten } : undefined;
  if (afwijking) {
    meldAfwijking(toolId, {
      ...afwijking,
      verschil: serverCenten - klantCenten,
      configHash: hashConfig(cfg.config),
      klantHash: snapshot.rekenkern?.configHash,
      invoer,
      regels: resultaat.regels.map((r) => [r.id, r.bedragExclCenten]),
    });
  }
  return { snapshot: bouwLeadSnapshot({ config: cfg.config, invoer, resultaat, bron: "server", afwijking }), afwijking, nagerekend: true };
}
