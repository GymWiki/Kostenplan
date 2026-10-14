import { invoerVanKlant, type BronProduct } from "@/app/lib/pricing/adapters";
import type { LocatieInvoer, PricingInput } from "@/app/lib/pricing/schema";
import type { AdresKeuze } from "@/app/lib/werkgebied/adres-invoer";
import type { Weergave } from "./config";

// Het "tuinplan" van de klant: welke onderdelen hij heeft gekozen en wat hij erbij heeft ingevuld. Alle weergaven
// (tegels, stappen, lijst) gebruiken dezelfde state en dezelfde functie om er de invoer voor de rekenkern van te maken,
// dus dezelfde keuzes geven altijd hetzelfde totaal en dezelfde aanvraag.

export type Tuinplan = {
  // Onderdelen die in het plan zitten (tegels en stappen). In de lijst telt elk onderdeel met invoer mee.
  toegevoegd: string[];
  hoeveelheden: Record<string, number>;
  sjabloonInvoer: Record<string, Record<string, unknown>>;
  materiaalKeuzes: Record<string, string>;
  extraKeuzes: Record<string, number>;
  adres: AdresKeuze;
};

export const leegTuinplan = (): Tuinplan => ({ toegevoegd: [], hoeveelheden: {}, sjabloonInvoer: {}, materiaalKeuzes: {}, extraKeuzes: {}, adres: { soort: "leeg" } });

// Welke onderdelen meetellen. In de lijst: alle (een onderdeel zonder invoer telt toch niet mee). Bij tegels en stappen:
// de onderdelen in het plan, plus eventueel het onderdeel dat de klant nu openheeft (voor de live prijs in de configurator).
export function actieveProducten<P extends { id: string }>(producten: readonly P[], weergave: Weergave, plan: Pick<Tuinplan, "toegevoegd">, open: string | null = null): P[] {
  if (weergave === "lijst") return [...producten];
  const ids = new Set(plan.toegevoegd);
  if (open) ids.add(open);
  return producten.filter((p) => ids.has(p.id));
}

export function planInvoer(producten: readonly BronProduct[], plan: Tuinplan, locatie?: LocatieInvoer): PricingInput {
  return invoerVanKlant({
    producten,
    hoeveelheden: plan.hoeveelheden,
    sjabloonInvoer: plan.sjabloonInvoer,
    materiaalKeuzes: plan.materiaalKeuzes,
    extraKeuzes: plan.extraKeuzes,
    locatie,
  });
}

// Een onderdeel uit het plan halen: ook zijn invoer en keuzes verdwijnen, zodat opnieuw toevoegen schoon begint.
export function verwijderUitPlan(plan: Tuinplan, product: BronProduct): Tuinplan {
  const { [product.id]: _h, ...hoeveelheden } = plan.hoeveelheden;
  const { [product.id]: _s, ...sjabloonInvoer } = plan.sjabloonInvoer;
  void _h;
  void _s;
  const categorieIds = new Set(product.materiaalCategorieen.map((c) => c.id));
  const extraIds = new Set(product.extraOpties.map((e) => e.id));
  return {
    ...plan,
    toegevoegd: plan.toegevoegd.filter((id) => id !== product.id),
    hoeveelheden,
    sjabloonInvoer,
    materiaalKeuzes: Object.fromEntries(Object.entries(plan.materiaalKeuzes).filter(([k]) => !categorieIds.has(k))),
    extraKeuzes: Object.fromEntries(Object.entries(plan.extraKeuzes).filter(([k]) => !extraIds.has(k))),
  };
}

// --- Bewaren tijdens het bezoek (sessionStorage; mag falen, dan werkt alles gewoon zonder) ---

export const tuinplanSleutel = (toolId: string) => `kp:tuinplan:${toolId}`;

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

// Leest een bewaard plan terug en gooit alles weg wat niet (meer) bij de rekentool past. Nooit een fout.
export function parseTuinplan(ruw: unknown, producten: readonly BronProduct[]): Tuinplan | null {
  if (!isObject(ruw)) return null;
  const productIds = new Set(producten.map((p) => p.id));
  const categorieIds = new Set(producten.flatMap((p) => p.materiaalCategorieen.map((c) => c.id)));
  const extraIds = new Set(producten.flatMap((p) => p.extraOpties.map((e) => e.id)));
  const plan = leegTuinplan();
  if (Array.isArray(ruw.toegevoegd)) plan.toegevoegd = ruw.toegevoegd.filter((id): id is string => typeof id === "string" && productIds.has(id));
  if (isObject(ruw.hoeveelheden)) for (const [k, v] of Object.entries(ruw.hoeveelheden)) if (productIds.has(k) && typeof v === "number" && Number.isFinite(v)) plan.hoeveelheden[k] = v;
  if (isObject(ruw.sjabloonInvoer)) for (const [k, v] of Object.entries(ruw.sjabloonInvoer)) if (productIds.has(k) && isObject(v)) plan.sjabloonInvoer[k] = v;
  if (isObject(ruw.materiaalKeuzes)) for (const [k, v] of Object.entries(ruw.materiaalKeuzes)) if (categorieIds.has(k) && typeof v === "string") plan.materiaalKeuzes[k] = v;
  if (isObject(ruw.extraKeuzes)) for (const [k, v] of Object.entries(ruw.extraKeuzes)) if (extraIds.has(k) && typeof v === "number" && Number.isFinite(v)) plan.extraKeuzes[k] = v;
  const a = ruw.adres;
  if (isObject(a) && (a.soort === "gevonden" || a.soort === "niet-gecontroleerd" || a.soort === "onbekend") && isObject(a.ruw) && typeof a.ruw.postcode === "string") plan.adres = a as unknown as AdresKeuze;
  return plan;
}

type Opslag = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const sessie = (): Opslag | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export function leesTuinplan(toolId: string, producten: readonly BronProduct[], opslag: Opslag | null = sessie()): Tuinplan | null {
  try {
    const tekst = opslag?.getItem(tuinplanSleutel(toolId));
    return tekst ? parseTuinplan(JSON.parse(tekst), producten) : null;
  } catch {
    return null;
  }
}

export function bewaarTuinplan(toolId: string, plan: Tuinplan, opslag: Opslag | null = sessie()): void {
  try {
    opslag?.setItem(tuinplanSleutel(toolId), JSON.stringify(plan));
  } catch {
    // Opslag vol of geblokkeerd: de rekentool werkt gewoon door.
  }
}

export function wisTuinplan(toolId: string, opslag: Opslag | null = sessie()): void {
  try {
    opslag?.removeItem(tuinplanSleutel(toolId));
  } catch {
    // zie boven
  }
}
