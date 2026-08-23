import type { ToolPrijsAfronding, ToolCtaType } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Levering B — de generieke calculator-engine. Dit bestand is de kern: het
// beschrijft de volledige vorm van een CalculatorConfig (wat er in
// CalculatorConfig.config, een Json-kolom, wordt opgeslagen) en alle
// bouwstenen daarbinnen (variabelen, velden, expressies, prijsregels,
// stappen, resultaatinstellingen).
//
// Net als sjablonen.ts (het bestaande, kleinere systeem voor
// Product.sjabloon) is dit bewust GEEN losse verzameling — alles hangt samen
// via CalculatorConfigData onderaan. In tegenstelling tot sjablonen.ts is dit
// een generieke, data-gedreven engine: nieuwe rekenlogica ontstaat door
// nieuwe CalculatorConfig-data te maken, niet door nieuwe React/TypeScript-
// code te schrijven (zie Expression hieronder — een veilige AST, nooit
// eval() of dynamische code).
//
// CalculatorConfigData.version is de schemaversie van DEZE datastructuur
// (nu 1) — bump die pas als de vorm van deze types zelf wijzigt op een
// manier die oude configs niet meer kan lezen. Dit is iets anders dan
// CalculatorConfig.version in het Prisma-schema, dat bijhoudt welke editie
// van de calculator van één Tool dit is (versie 1, 2, 3, ... — zie Fase 11).
// ---------------------------------------------------------------------------

// =============================================================================
// Eenheden — hergebruikt dezelfde aanpak als Product.eenheid (app/lib/units.ts):
// een vrije string i.p.v. een gesloten enum, met UNIT_GROUPS/unitLabel() voor
// weergave. Geen aparte eenhedenlijst voor de engine.
// =============================================================================

export type Unit = string;

// =============================================================================
// Variabelen (Deel 9) — getypeerd, nooit als kale string opgeslagen.
// =============================================================================

export type VariableType = "NUMBER" | "BOOLEAN" | "OPTION" | "OPTIONS" | "TEXT" | "DATE";

// Elk CalculatorField (zie hieronder) levert automatisch een variabele met
// dezelfde id — dat hoeft dus niet apart in `variables` te staan. Alleen
// AFGELEIDE variabelen (bijv. oppervlakte = lengte × breedte) staan hier
// expliciet, met de Expression die ze berekent.
export type DerivedVariable = {
  id: string;
  label: string;
  type: VariableType;
  expression: Expression;
};

// Speciale, altijd-beschikbare variabele: de lopende subtotaal van alle
// eerder in `rules` geëvalueerde regels — hiermee kan een toeslag/korting/
// percentageregel verwijzen naar "de basisprijs tot nu toe" zonder dat de
// builder losse regel-ID's aan elkaar hoeft te knopen (zie PriceRule
// hieronder en Deel 6/8 van de opdracht).
export const RUNNING_SUBTOTAL_VARIABLE = "$subtotaal";

// =============================================================================
// Expressies (Deel 33) — veilige, declaratieve AST. Wordt geïnterpreteerd
// door evaluateExpression() in expression.ts; nooit eval() of new Function().
// =============================================================================

export type Expression =
  | { kind: "GETAL"; waarde: number }
  | { kind: "BOOLEAN"; waarde: boolean }
  | { kind: "TEKST"; waarde: string }
  | { kind: "VARIABELE"; naam: string }
  | { kind: "OPTELLEN"; termen: Expression[] }
  | { kind: "AFTREKKEN"; links: Expression; rechts: Expression }
  | { kind: "VERMENIGVULDIGEN"; factoren: Expression[] }
  | { kind: "DELEN"; links: Expression; rechts: Expression }
  | { kind: "PERCENTAGE_VAN"; basis: Expression; percentage: Expression }
  | { kind: "GELIJK_AAN"; links: Expression; rechts: Expression }
  | { kind: "NIET_GELIJK_AAN"; links: Expression; rechts: Expression }
  | { kind: "GROTER_DAN"; links: Expression; rechts: Expression }
  | { kind: "KLEINER_DAN"; links: Expression; rechts: Expression }
  | { kind: "GROTER_OF_GELIJK"; links: Expression; rechts: Expression }
  | { kind: "KLEINER_OF_GELIJK"; links: Expression; rechts: Expression }
  | { kind: "EN"; voorwaarden: Expression[] }
  | { kind: "OF"; voorwaarden: Expression[] }
  | { kind: "NIET"; voorwaarde: Expression }
  | { kind: "MINIMUM"; waarden: Expression[] }
  | { kind: "MAXIMUM"; waarden: Expression[] }
  | { kind: "ALS_DAN"; voorwaarde: Expression; dan: Expression; anders: Expression }
  // "bevat" (Deel 6 modulair) — voor MEERKEUZE-velden: is `waarde` aanwezig
  // in de lijst die `lijst` oplevert? Bewust een eigen kind i.p.v. GELIJK_AAN
  // te laten dubbelen als "bevat" — dat zou een non-technische vakman
  // verwarren ("is gelijk aan" leest als scalaire vergelijking).
  | { kind: "BEVAT"; lijst: Expression; waarde: Expression };

// =============================================================================
// Velden / inputs (Deel 10-13) — wat de klant invult of kiest. Elk veld
// levert een variabele met dezelfde `id`, getypeerd naar VariableType (zie
// veldVariabeleType() in fields.ts).
// =============================================================================

type FieldBasis = {
  id: string;
  label: string;
  helpTekst?: string;
  verplicht: boolean;
  // Conditionele zichtbaarheid (Deel 6 geldt ook voor velden, niet alleen
  // prijsregels) — ontbreekt = altijd zichtbaar.
  zichtbaarAls?: Expression;
  // Conditioneel verplicht (Deel 8 modulair) — bovenop de statische
  // `verplicht` hierboven: wordt dit veld ALS deze expressie waar is óók
  // verplicht, ook wanneer `verplicht` zelf false is. Ontbreekt = alleen de
  // statische vlag telt. Zie veldIsIngevuld() in fields.ts.
  verplichtAls?: Expression;
};

export type NummerVeld = FieldBasis & {
  soort: "NUMMER" | "AANTAL" | "OPPERVLAKTE";
  eenheid?: Unit;
  min?: number;
  max?: number;
  stap?: number;
  standaardWaarde?: number;
};

export type SchuifVeld = FieldBasis & {
  soort: "SLIDER";
  eenheid?: Unit;
  min: number;
  max: number;
  stap: number;
  standaardWaarde?: number;
};

export type TekstVeld = FieldBasis & {
  soort: "TEKST";
  placeholder?: string;
  standaardWaarde?: string;
};

export type BooleanVeld = FieldBasis & {
  soort: "JA_NEE" | "CHECKBOX";
  standaardWaarde?: boolean;
};

export type KeuzeOptie = { waarde: string; label: string };

export type KeuzeVeld = FieldBasis & {
  soort: "DROPDOWN" | "RADIO";
  opties: KeuzeOptie[];
  standaardWaarde?: string;
};

// Meerdere keuzes (Deel 3 modulair) — zelfde optiestructuur als KeuzeVeld,
// maar de klant kan meerdere opties tegelijk aanvinken. Levert een OPTIONS-
// variabele (string[]) op i.p.v. OPTION; conditionele regels gebruiken de
// nieuwe BEVAT-expressie hierboven om te testen of één specifieke optie is
// aangevinkt (i.p.v. GELIJK_AAN, dat scalair blijft).
export type MeerkeuzeVeld = FieldBasis & {
  soort: "MEERKEUZE";
  opties: KeuzeOptie[];
  standaardWaarden?: string[];
};

// Afmetingen (Deel 12) — bundelt lengte/breedte/(hoogte) in één klantvraag;
// levert zelf geen variabele op maar wél automatisch afgeleide variabelen
// (lengte/breedte/hoogte + oppervlakte/volume, zie afgeleideVariabelenVoorVeld
// in fields.ts) — geen losse DerivedVariable-configuratie nodig.
export type AfmetingenVeld = FieldBasis & {
  soort: "AFMETINGEN";
  eenheid: Unit;
  metHoogte: boolean;
};

// Productkeuze (Deel 11) — bouwt voort op de bestaande MaterialCategory/
// MaterialOption-structuur (zie app/lib/calculate.ts) i.p.v. een tweede,
// losse productcatalogus. `materialCategoryId` wijst naar een bestaande
// MaterialCategory (met zijn MaterialOption[] als keuzes, elk met een eigen
// prijs) van een Product dat bij dezelfde Tool hoort. Levert een OPTION-
// variabele (het gekozen MaterialOption-id) én automatisch een NUMBER-
// variabele `${id}Prijs` (de prijs van de gekozen optie) die prijsregels
// rechtstreeks kunnen gebruiken (bijv. "oppervlakte × schuttingPrijs").
export type ProductKeuzeVeld = FieldBasis & {
  soort: "PRODUCT_KEUZE";
  materialCategoryId: string;
};

export type CalculatorField =
  | NummerVeld
  | SchuifVeld
  | TekstVeld
  | BooleanVeld
  | KeuzeVeld
  | MeerkeuzeVeld
  | AfmetingenVeld
  | ProductKeuzeVeld;

// =============================================================================
// Prijsregels (Deel 6-8) — de prijsregel-/rule-engine. Elke regel hoort bij
// een categorie (voor de Result-engine, zie result.ts) en kan een conditie
// hebben (Deel 7). `basis`/`hoeveelheid`/`bedrag`/`percentage` zijn zelf
// Expression's — dat geeft in één klap zowel letterlijke waarden
// ({kind:"GETAL", waarde:24}) als verwijzingen naar variabelen
// ({kind:"VARIABELE", naam:"oppervlakte"}) zonder een aparte syntax.
// =============================================================================

export type PriceRuleCategory = "MATERIAAL" | "ARBEID" | "TRANSPORT" | "TOESLAG" | "KORTING" | "OVERIG";

type PriceRuleBasis = {
  id: string;
  label: string;
  categorie: PriceRuleCategory;
  // ALS ... (Deel 7) — regel telt alleen mee als deze expressie waar is.
  // Ontbreekt = regel geldt altijd.
  voorwaarde?: Expression;
  // Uitgeschakelde regel: blijft in de configuratie staan (bijv. tijdelijk
  // uitzetten zonder 'm te verwijderen) maar telt nergens in mee.
  actief: boolean;
  // Deel 16: telt deze regel mee in de "Uitgebreid"-uitsplitsing die de
  // klant ziet? Staat los van `intern` hieronder — een regel kan zichtbaar
  // zijn zonder in de uitsplitsing te verschijnen (bijv. een kleine
  // toeslag die gewoon in het totaal verdwijnt).
  toonInUitsplitsing: boolean;
  // Deel 35: gevoelige/interne prijsinformatie (inkoopprijs, marge, interne
  // kosten). Een `intern`-regel wordt NOOIT naar de publieke/embed-pagina
  // gestuurd (zie publicConfig in config.ts) — de klant kan 'm dus ook nooit
  // via de browser-devtools zien. Gevolg: een interne regel telt niet mee in
  // de live, klant-zichtbare prijs (de engine draait volledig client-side,
  // zie Deel 34) — dit is bewust de eenvoudige, veilige keuze voor Levering B
  // in plaats van een aparte server-side herberekeningsstap.
  intern: boolean;
};

export type VastPriceRule = PriceRuleBasis & { type: "VAST"; bedrag: Expression };

export type PerEenheidPriceRule = PriceRuleBasis & {
  type: "PER_EENHEID";
  hoeveelheid: Expression;
  prijsPerEenheid: Expression;
  eenheid: Unit;
};

export type PercentagePriceRule = PriceRuleBasis & {
  type: "PERCENTAGE";
  basis: Expression;
  percentage: Expression;
};

export type ToeslagPriceRule = PriceRuleBasis & { type: "TOESLAG"; bedrag: Expression };

export type KortingPriceRule = PriceRuleBasis & {
  type: "KORTING";
  // Precies één van beide — de builder-UI laat de vakman kiezen tussen
  // "korting in %" en "korting in €" (zie Deel 6: percentage- en
  // bedragkorting zijn allebei genoemd).
  percentage?: Expression;
  bedrag?: Expression;
};

// Staffel (Deel 6) — bijv. 0-10m €100/m, 11-25m €90/m, 26+ €80/m. `tot` is
// de bovengrens van elke schijf (null = geen bovengrens, de laatste schijf).
// Rekent per schijf door (progressief), niet "hele hoeveelheid tegen het
// tarief van de hoogste bereikte schijf" — dat is de meest voorspelbare,
// meest gebruikelijke staffelbetekenis voor een vakman.
export type StaffelSchijf = { tot: number | null; prijsPerEenheid: number };

export type StaffelPriceRule = PriceRuleBasis & {
  type: "STAFFEL";
  hoeveelheid: Expression;
  eenheid: Unit;
  schijven: StaffelSchijf[];
};

// Ontsnappingsluik voor complexere formules die de andere regeltypes niet
// dekken — nog steeds een veilige Expression, geen vrije code.
export type FormulePriceRule = PriceRuleBasis & { type: "FORMULE"; formule: Expression };

export type PriceRule =
  | VastPriceRule
  | PerEenheidPriceRule
  | PercentagePriceRule
  | ToeslagPriceRule
  | KortingPriceRule
  | StaffelPriceRule
  | FormulePriceRule;

// =============================================================================
// Stappen (Deel 17) — een CalculatorConfig bepaalt zelf welke stappen
// bestaan; elke stap toont een subset van `fields`, in volgorde. Het
// resultaat en het aanvraagformulier zijn altijd de laatste twee (impliciete)
// stappen — geen aparte entries hiervoor nodig, want die hergebruiken
// resultSettings (hieronder) resp. Tool.leadFormConfig uit Levering A.
// =============================================================================

export type CalculatorStep = {
  id: string;
  titel: string;
  beschrijving?: string;
  veldIds: string[];
};

// =============================================================================
// Resultaatinstellingen (Deel 15-16) — rijker dan het bestaande
// ToolResultaatConfig (Levering A), specifiek omdat de engine een
// "Uitgebreid"-weergave (kostenuitsplitsing) kan tonen die de oude,
// sjabloon-gedreven calculator niet kent. Hergebruikt bewust dezelfde
// ToolPrijsAfronding/ToolCtaType-enums uit Levering A (app/lib/tools.ts) —
// geen tweede afrondings-/CTA-systeem.
// =============================================================================

export type ResultDisplayMode = "EXACT" | "VANAF" | "RANGE" | "UITGEBREID" | "GEEN";

export type CalculatorResultSettings = {
  weergave: ResultDisplayMode;
  afronding: ToolPrijsAfronding;
  ctaType: ToolCtaType;
  ctaTekst: string | null;
  toelichting: string | null;
  // Alleen relevant bij weergave "RANGE" — zelfde eenvoudige ±marge-op-het-
  // totaal-aanpak als CostSettings.bandbreedteModus "TOTAAL" uit Levering A
  // (zie resolveCostSettings/calculateBreakdownRange), bewust hergebruikt
  // i.p.v. per-prijsregel bandbreedtes door de hele rule-engine te weven.
  bandbreedteMargeOmlaag: number;
  bandbreedteMargeOmhoog: number;
};

// =============================================================================
// Calculator-types (Deel 5) — puur beschrijvend/UX-sturend (welke
// starterinputs de builder voorstelt, welke flow-copy getoond wordt); de
// onderliggende engine (velden/regels) is voor elk type identiek generiek.
// Zie calculator-types.ts voor de registry.
// =============================================================================

export type CalculatorTypeId = "OPPERVLAKTE" | "RUIMTE" | "PRODUCT" | "WERKZAAMHEDEN" | "PROJECT" | "CONFIGURATOR";

// =============================================================================
// De volledige configuratie — dit is wat in CalculatorConfig.config (Json)
// wordt opgeslagen. `versie` is de schemaversie van deze datastructuur zelf
// (Deel 4: "calculatorConfig.version"), niet de Tool-brede concept-/
// publicatieversie (die leeft op de Prisma-rij CalculatorConfig.version).
// =============================================================================

export type CalculatorConfigData = {
  versie: 1;
  calculatorType: CalculatorTypeId;
  velden: CalculatorField[];
  afgeleideVariabelen: DerivedVariable[];
  regels: PriceRule[];
  stappen: CalculatorStep[];
  resultaatInstellingen: CalculatorResultSettings;
};
