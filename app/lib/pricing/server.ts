import "server-only";
import { getMateriaalOptiesVoorEngineVelden, getToolForEmbed } from "@/app/lib/dal";
import { alleVeldenVanConfig, berekenModulair, bouwModulairSnapshot, parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import type { LeadSnapshot } from "@/app/lib/leads";
import { resolveCostSettings } from "@/app/lib/tools";
import { configVanProducten } from "./adapters";
import { berekenPrijs } from "./engine";
import { hashConfig } from "./hash";
import type { LocatieInvoer, PricingConfig } from "./schema";
import { resolveWerkgebied, type WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import { meldingBuiten, meldingOnderMinimum, meldingZoneNietMogelijk } from "@/app/lib/werkgebied/teksten";
import { zoekPostcodeHuisnummer, type PdokAdres, type PdokUitslag } from "@/app/lib/werkgebied/pdok";
import { afstandKm, rondKm } from "@/app/lib/werkgebied/afstand";

// De server rekent een aanvraag altijd zelf na met dezelfde rekenkern als de browser, uit de keuzes
// van de klant en de configuratie van dat moment. Het bedrag van de browser wordt nooit vertrouwd.

export type ServerConfig =
  | { soort: "onderdelen"; config: PricingConfig; configId: string | null; instellingen: WerkgebiedInstellingen }
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
  const instellingen = resolveWerkgebied(tool.company.werkgebied, tool.werkgebied);
  return { soort: "onderdelen", config: configVanProducten(tool.products, kosten, { werkgebied: instellingen }), configId: tool.activeCalculatorConfigId ?? null, instellingen };
}

export type Nagerekend = {
  snapshot: LeadSnapshot;
  // Wat de browser als totaal liet zien en wat de server berekende (centen incl. btw), alleen als ze verschillen.
  afwijking?: { klantCenten: number; serverCenten: number };
  // false: er kon niet nagerekend worden (oudere browser zonder invoer, of een ander type rekentool).
  nagerekend: boolean;
  // Volgens het werkgebied of het minimum mag deze aanvraag niet; de melding is dezelfde als die de klant in de rekentool zag.
  geweigerd?: string;
};

export type HerberekenOpties = {
  // "reserve": een aanvraag die eerder in de Cloudflare-reserve is aangenomen; die wordt gemarkeerd, nooit geweigerd.
  bron?: "interactief" | "reserve";
  // Voor tests: de adresopzoeking.
  zoekAdres?: (postcode: string, huisnummer: string, toevoeging: string) => Promise<PdokUitslag<PdokAdres | null>>;
};

const topCenten = (r: { totaalInclCenten: number; bandbreedte?: unknown }): number => {
  const b = r.bandbreedte as { max?: { totaalInclCenten?: number } } | null | undefined;
  return typeof b?.max?.totaalInclCenten === "number" ? b.max.totaalInclCenten : r.totaalInclCenten;
};

function meldAfwijking(toolId: string, details: Record<string, unknown>) {
  console.warn("[prijs] servertotaal wijkt af van de browser", JSON.stringify({ toolId, ...details }));
}

export const MELDING_INVOER_ONTBREEKT = "Je aanvraag is niet compleet. Ververs de pagina en probeer het opnieuw.";
export const MELDING_ADRES_ONTBREEKT = "Vul je postcode en huisnummer in om je aanvraag te versturen.";
export const MELDING_ADRES_ONBEKEND = "We vinden dit adres niet. Controleer je postcode en huisnummer.";

// Het adres van de klant door de server vastgesteld: de afstand komt nooit uit de browser.
async function bepaalLocatie(
  invoerLocatie: LocatieInvoer | undefined,
  i: WerkgebiedInstellingen,
  opties: HerberekenOpties,
): Promise<{ locatie: LocatieInvoer | undefined; adres: PdokAdres | null; onbekend: boolean }> {
  if (!i.werkgebied.aan || !invoerLocatie?.postcode) return { locatie: invoerLocatie ? { ...invoerLocatie, afstandKm: null } : undefined, adres: null, onbekend: false };
  const zoek = opties.zoekAdres ?? zoekPostcodeHuisnummer;
  const r = await zoek(invoerLocatie.postcode, invoerLocatie.huisnummer, invoerLocatie.toevoeging);
  if (!r.ok) return { locatie: { ...invoerLocatie, afstandKm: null }, adres: null, onbekend: false };
  if (!r.waarde) return { locatie: { ...invoerLocatie, afstandKm: null }, adres: null, onbekend: true };
  const start = i.werkgebied.methode === "STRAAL" ? i.werkgebied.start : null;
  const afstand = start ? rondKm(afstandKm(start, { lat: r.waarde.lat, lon: r.waarde.lon })) : null;
  return { locatie: { ...invoerLocatie, afstandKm: afstand }, adres: r.waarde, onbekend: false };
}

export async function herberekenAanvraag(toolId: string, snapshot: LeadSnapshot, opties: HerberekenOpties = {}): Promise<Nagerekend> {
  const invoer = snapshot.rekenkern?.invoer;
  const waarden = snapshot.modulair?.waarden;
  const cfg = await laadPricingConfig(toolId);
  if (!invoer && !waarden) {
    console.warn("[prijs] aanvraag zonder invoer, niet nagerekend", JSON.stringify({ toolId, totaal: snapshot.totaal }));
    // Een interactieve aanvraag voor een rekentool die de server kan narekenen moet de invoer meesturen. Zonder invoer
    // zou het bedrag van de browser, werkgebied en minimum voorbij, ongecontroleerd worden opgeslagen.
    // Alleen de reserve-opname (oudere aanvragen) blijft zonder invoer toegestaan.
    if (cfg && (opties.bron ?? "interactief") === "interactief") return { snapshot, nagerekend: false, geweigerd: MELDING_INVOER_ONTBREEKT };
    return { snapshot, nagerekend: false };
  }
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

  // Werkgebied: de server zoekt het adres zelf op en rekent de afstand zelf uit.
  const interactief = (opties.bron ?? "interactief") === "interactief";
  const { locatie, adres, onbekend } = await bepaalLocatie(invoer.locatie, cfg.instellingen, opties);
  if (cfg.instellingen.werkgebied.aan && interactief) {
    if (!invoer.locatie?.postcode) return { snapshot, nagerekend: false, geweigerd: MELDING_ADRES_ONTBREEKT };
    if (onbekend) return { snapshot, nagerekend: false, geweigerd: MELDING_ADRES_ONBEKEND };
  }
  const serverInvoer = locatie ? { ...invoer, locatie } : invoer;
  const resultaat = berekenPrijs(cfg.config, serverInvoer);
  if (!resultaat.requestAllowed && interactief) {
    const min = resultaat.minimum;
    const melding = !resultaat.serviceArea.allowed
      ? resultaat.serviceArea.reason === "zone-not-possible" ? meldingZoneNietMogelijk : meldingBuiten(cfg.instellingen.werkgebied.melding)
      : meldingOnderMinimum(min.minimumInclCenten);
    return { snapshot, nagerekend: true, geweigerd: melding };
  }
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
  return { snapshot: bouwLeadSnapshot({ config: cfg.config, invoer: serverInvoer, resultaat, bron: "server", afwijking, adres }), afwijking, nagerekend: true };
}
