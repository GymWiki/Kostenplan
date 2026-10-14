// Instellingen voor hoe de klant-rekentool eruitziet en waar hij staat: Tool.weergaveConfig (Json).
// Zelfde patroon als resultaatConfig: ontbrekende of ongeldige velden vallen terug op de standaard, zodat een
// bestaande rekentool (lege `{}`) zich blijft gedragen als "Alles op één pagina" tot de hovenier zelf kiest.

export const WEERGAVEN = ["tegels", "stappen", "lijst"] as const;
export type Weergave = (typeof WEERGAVEN)[number];

export const WEERGAVE_LABEL: Record<Weergave, string> = {
  tegels: "Tegels",
  stappen: "Stappen",
  lijst: "Alles op één pagina",
};

export const WEERGAVE_UITLEG: Record<Weergave, string> = {
  tegels: "Je klant ziet een tegel per onderdeel en kiest wat hij nodig heeft. Handig bij veel onderdelen of wisselende wensen.",
  stappen: "Je klant wordt stap voor stap geleid: eerst kiezen, dan per onderdeel invullen. Handig als je klant begeleiding nodig heeft.",
  lijst: "Alle onderdelen onder elkaar met de prijs ernaast. Handig bij weinig onderdelen of als je klant al weet wat hij wil.",
};

export const PLAATSINGEN = ["inline", "popup"] as const;
export type Plaatsing = (typeof PLAATSINGEN)[number];

export const KNOP_POSITIES = ["rechtsonder", "linksonder", "inline"] as const;
export type KnopPositie = (typeof KNOP_POSITIES)[number];

export const MAX_TEGELTEKST = 40;

export type OnderdeelWeergave = {
  // Eigen korte tekst op de tegel in plaats van de "vanaf"-prijs (max. 40 tekens).
  tegelTekst: string | null;
  // Maat voor de "vanaf"-prijs (in de eenheid van het onderdeel). null = standaard (10 m, 10 m² of 1 stuk).
  voorbeeldmaat: number | null;
};

export type WeergaveConfig = {
  weergave: Weergave;
  plaatsing: Plaatsing;
  knopTekst: string;
  knopPositie: KnopPositie;
  kop: string;
  toevoegTekst: string;
  // Toon de prijs pas nadat de klant zijn gegevens heeft verstuurd. Standaard uit: kan klanten afschrikken.
  prijsNaContact: boolean;
  // Voorrijkosten meetellen in de "vanaf"-prijs. Standaard uit ("excl. voorrijkosten").
  vanafInclVoorrij: boolean;
  onderdelen: Record<string, OnderdeelWeergave>;
};

export const STANDAARD_KOP = "Waar kunnen we je mee helpen?";
export const STANDAARD_TOEVOEGTEKST = "Toevoegen aan mijn tuinplan";
export const STANDAARD_KNOPTEKST = "Bereken je prijs";

// Bestaande rekentools: precies de weergave van vóór de keuze.
export const STANDAARD_WEERGAVE_CONFIG: WeergaveConfig = {
  weergave: "lijst",
  plaatsing: "inline",
  knopTekst: STANDAARD_KNOPTEKST,
  knopPositie: "rechtsonder",
  kop: STANDAARD_KOP,
  toevoegTekst: STANDAARD_TOEVOEGTEKST,
  prijsNaContact: false,
  vanafInclVoorrij: false,
  onderdelen: {},
};

// Nieuwe rekentools starten met tegels.
export const NIEUWE_REKENTOOL_WEERGAVE: Partial<WeergaveConfig> = { weergave: "tegels" };

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const tekst = (v: unknown, standaard: string, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : standaard);
const kies = <T extends string>(v: unknown, opties: readonly T[], standaard: T): T => (typeof v === "string" && (opties as readonly string[]).includes(v) ? (v as T) : standaard);

export function parseWeergaveConfig(json: unknown): WeergaveConfig {
  const r = isObject(json) ? json : {};
  const onderdelen: Record<string, OnderdeelWeergave> = {};
  if (isObject(r.onderdelen)) {
    for (const [id, w] of Object.entries(r.onderdelen)) {
      if (!isObject(w)) continue;
      const t = typeof w.tegelTekst === "string" && w.tegelTekst.trim() ? w.tegelTekst.trim().slice(0, MAX_TEGELTEKST) : null;
      const m = typeof w.voorbeeldmaat === "number" && Number.isFinite(w.voorbeeldmaat) && w.voorbeeldmaat > 0 && w.voorbeeldmaat <= 100000 ? w.voorbeeldmaat : null;
      if (t !== null || m !== null) onderdelen[id] = { tegelTekst: t, voorbeeldmaat: m };
    }
  }
  return {
    weergave: kies(r.weergave, WEERGAVEN, STANDAARD_WEERGAVE_CONFIG.weergave),
    plaatsing: kies(r.plaatsing, PLAATSINGEN, STANDAARD_WEERGAVE_CONFIG.plaatsing),
    knopTekst: tekst(r.knopTekst, STANDAARD_KNOPTEKST, 40),
    knopPositie: kies(r.knopPositie, KNOP_POSITIES, STANDAARD_WEERGAVE_CONFIG.knopPositie),
    kop: tekst(r.kop, STANDAARD_KOP, 80),
    toevoegTekst: tekst(r.toevoegTekst, STANDAARD_TOEVOEGTEKST, 40),
    prijsNaContact: r.prijsNaContact === true,
    vanafInclVoorrij: r.vanafInclVoorrij === true,
    onderdelen,
  };
}
