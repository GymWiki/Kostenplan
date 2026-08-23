import { productKeuzePrijsVariabele, afmetingenSubvariabelen } from "../fields";
import { perEenheidRegel, toeslagRegel } from "../templates/helpers";
import type { Expression } from "../types";
import type { OnderdeelTemplate } from "./types";

// KEUKEN (Deel 14 van de opdracht) — bewijst dat de engine ook een heel
// ander soort samenstelling aankan: geen "oppervlakte in de tuin" maar
// losse, stuksgewijze onderdelen van een keukenrenovatie.

const bevatApparaat = (waarde: string): Expression => ({
  kind: "BEVAT",
  lijst: { kind: "VARIABELE", naam: "apparaten" },
  waarde: { kind: "TEKST", waarde },
});

const keukenopstellingOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-keukenopstelling",
  naam: "Keukenopstelling",
  categorie: "Keuken",
  beschrijving: "Lengte van de keukenopstelling.",
  icoon: "LayoutGrid",
  bouwSlice: () => ({
    velden: [{ id: "lengte", label: "Lengte keukenopstelling", soort: "NUMMER", verplicht: true, eenheid: "meter", min: 0 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "opstelling", label: "Keukenkast-opstelling", categorie: "MATERIAAL" }, { kind: "VARIABELE", naam: "lengte" }, { kind: "GETAL", waarde: 850 }, "meter")],
  }),
  materiaalKeuzes: [],
};

const kastenOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-kasten",
  naam: "Kasten",
  categorie: "Keuken",
  beschrijving: "Aantal extra bovenkasten/onderkasten.",
  icoon: "Package",
  bouwSlice: () => ({
    velden: [{ id: "aantalKasten", label: "Aantal kasten", soort: "AANTAL", verplicht: true, min: 0 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "kasten", label: "Kasten", categorie: "MATERIAAL" }, { kind: "VARIABELE", naam: "aantalKasten" }, { kind: "GETAL", waarde: 165 }, "stuk")],
  }),
  materiaalKeuzes: [],
};

const WERKBLAD_VELD_ID = "typeWerkblad";
const AFMETING_VELD_ID = "afmetingWerkblad";
const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);

const werkbladOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-werkblad",
  naam: "Werkblad",
  categorie: "Keuken",
  beschrijving: "Oppervlakte en materiaalkeuze van het werkblad.",
  icoon: "RectangleHorizontal",
  bouwSlice: () => ({
    velden: [
      { id: AFMETING_VELD_ID, label: "Afmetingen werkblad", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      { id: WERKBLAD_VELD_ID, label: "Materiaal werkblad", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: WERKBLAD_VELD_ID },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "werkblad", label: "Werkblad", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(WERKBLAD_VELD_ID) },
        "m²"
      ),
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: WERKBLAD_VELD_ID,
      opties: [
        { naam: "Laminaat", prijs: 145 },
        { naam: "Composiet", prijs: 385 },
        { naam: "Graniet", prijs: 520 },
      ],
    },
  ],
};

const apparatuurOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-apparatuur",
  naam: "Apparatuur",
  categorie: "Keuken",
  beschrijving: "Inbouwapparatuur — kies wat de klant nodig heeft.",
  icoon: "Refrigerator",
  bouwSlice: () => ({
    velden: [
      {
        id: "apparaten",
        label: "Welke apparatuur?",
        soort: "MEERKEUZE",
        verplicht: false,
        opties: [
          { waarde: "oven", label: "Inbouwoven" },
          { waarde: "kookplaat", label: "Kookplaat" },
          { waarde: "afzuigkap", label: "Afzuigkap" },
          { waarde: "vaatwasser", label: "Vaatwasser" },
        ],
      },
    ],
    afgeleideVariabelen: [],
    regels: [
      toeslagRegel({ id: "oven", label: "Inbouwoven", categorie: "MATERIAAL", voorwaarde: bevatApparaat("oven") }, 495),
      toeslagRegel({ id: "kookplaat", label: "Kookplaat", categorie: "MATERIAAL", voorwaarde: bevatApparaat("kookplaat") }, 425),
      toeslagRegel({ id: "afzuigkap", label: "Afzuigkap", categorie: "MATERIAAL", voorwaarde: bevatApparaat("afzuigkap") }, 295),
      toeslagRegel({ id: "vaatwasser", label: "Vaatwasser", categorie: "MATERIAAL", voorwaarde: bevatApparaat("vaatwasser") }, 375),
    ],
  }),
  materiaalKeuzes: [],
};

const montageOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-keuken-montage",
  naam: "Montage",
  categorie: "Keuken",
  beschrijving: "Uren montage (plaatsing en aansluiten).",
  icoon: "Wrench",
  bouwSlice: () => ({
    velden: [{ id: "uren", label: "Geschatte montage-uren", soort: "NUMMER", verplicht: true, min: 0, standaardWaarde: 8 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "montage", label: "Montage", categorie: "ARBEID" }, { kind: "VARIABELE", naam: "uren" }, { kind: "GETAL", waarde: 55 }, "uur")],
  }),
  materiaalKeuzes: [],
};

export const KEUKEN_ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [
  keukenopstellingOnderdeel,
  kastenOnderdeel,
  werkbladOnderdeel,
  apparatuurOnderdeel,
  montageOnderdeel,
];
