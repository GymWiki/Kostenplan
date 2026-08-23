import { productKeuzePrijsVariabele } from "../fields";
import { perEenheidRegel } from "../templates/helpers";
import type { OnderdeelTemplate } from "./types";

// KOZIJNEN (Deel 14 van de opdracht).

const KOZIJN_VELD_ID = "materiaalKozijn";
const kozijnOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-kozijn",
  naam: "Kozijn",
  categorie: "Kozijnen",
  beschrijving: "Aantal kozijnen en materiaalkeuze.",
  icoon: "AppWindow",
  bouwSlice: () => ({
    velden: [
      { id: "aantalKozijnen", label: "Aantal kozijnen", soort: "AANTAL", verplicht: true, min: 1, standaardWaarde: 1 },
      { id: KOZIJN_VELD_ID, label: "Materiaal kozijn", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: KOZIJN_VELD_ID },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "kozijn", label: "Kozijn", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: "aantalKozijnen" },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(KOZIJN_VELD_ID) },
        "stuk"
      ),
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: KOZIJN_VELD_ID,
      opties: [
        { naam: "Kunststof", prijs: 280 },
        { naam: "Aluminium", prijs: 420 },
        { naam: "Hout", prijs: 380 },
      ],
    },
  ],
};

const GLAS_VELD_ID = "typeGlas";
const glasOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-glas",
  naam: "Glas",
  categorie: "Kozijnen",
  beschrijving: "Aantal kozijnen en glassoort.",
  icoon: "PanelTop",
  bouwSlice: () => ({
    velden: [
      { id: "aantalKozijnen", label: "Aantal kozijnen", soort: "AANTAL", verplicht: true, min: 1, standaardWaarde: 1 },
      { id: GLAS_VELD_ID, label: "Glassoort", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: GLAS_VELD_ID },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "glas", label: "Beglazing", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: "aantalKozijnen" },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(GLAS_VELD_ID) },
        "stuk"
      ),
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: GLAS_VELD_ID,
      opties: [
        { naam: "Dubbel glas (HR++)", prijs: 145 },
        { naam: "Triple glas", prijs: 245 },
      ],
    },
  ],
};

const ventilatieroosterOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-ventilatierooster",
  naam: "Ventilatierooster",
  categorie: "Kozijnen",
  beschrijving: "Optioneel ventilatierooster per kozijn.",
  icoon: "Wind",
  bouwSlice: () => ({
    velden: [{ id: "aantalRoosters", label: "Aantal ventilatieroosters", soort: "AANTAL", verplicht: false, min: 0 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "rooster", label: "Ventilatierooster", categorie: "MATERIAAL" }, { kind: "VARIABELE", naam: "aantalRoosters" }, { kind: "GETAL", waarde: 45 }, "stuk")],
  }),
  materiaalKeuzes: [],
};

const vensterbankOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-vensterbank",
  naam: "Vensterbank",
  categorie: "Kozijnen",
  beschrijving: "Optionele vensterbank per kozijn.",
  icoon: "Minus",
  bouwSlice: () => ({
    velden: [{ id: "aantalVensterbanken", label: "Aantal vensterbanken", soort: "AANTAL", verplicht: false, min: 0 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "vensterbank", label: "Vensterbank", categorie: "MATERIAAL" }, { kind: "VARIABELE", naam: "aantalVensterbanken" }, { kind: "GETAL", waarde: 65 }, "stuk")],
  }),
  materiaalKeuzes: [],
};

const montageOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-kozijnen-montage",
  naam: "Montage",
  categorie: "Kozijnen",
  beschrijving: "Montage per kozijn.",
  icoon: "Wrench",
  bouwSlice: () => ({
    velden: [{ id: "aantalKozijnen", label: "Aantal kozijnen", soort: "AANTAL", verplicht: true, min: 1, standaardWaarde: 1 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "montage", label: "Montage", categorie: "ARBEID" }, { kind: "VARIABELE", naam: "aantalKozijnen" }, { kind: "GETAL", waarde: 95 }, "stuk")],
  }),
  materiaalKeuzes: [],
};

export const KOZIJNEN_ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [
  kozijnOnderdeel,
  glasOnderdeel,
  ventilatieroosterOnderdeel,
  vensterbankOnderdeel,
  montageOnderdeel,
];
