import { productKeuzePrijsVariabele, afmetingenSubvariabelen } from "../fields";
import { perEenheidRegel } from "../templates/helpers";
import type { OnderdeelTemplate } from "./types";

// BADKAMER (Deel 14 van de opdracht).

const AFMETING_VELD_ID = "afmetingTegels";
const TEGEL_VELD_ID = "typeTegel";
const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);

const tegelwerkOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-tegelwerk",
  naam: "Tegelwerk",
  categorie: "Badkamer",
  beschrijving: "Oppervlakte en materiaalkeuze van het tegelwerk.",
  icoon: "Grid2x2",
  bouwSlice: () => ({
    velden: [
      { id: AFMETING_VELD_ID, label: "Te betegelen oppervlak", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      { id: TEGEL_VELD_ID, label: "Type tegel", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: TEGEL_VELD_ID },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "tegels", label: "Tegels", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(TEGEL_VELD_ID) },
        "m²"
      ),
      perEenheidRegel({ id: "tegelwerk-arbeid", label: "Tegelwerk (arbeid)", categorie: "ARBEID" }, { kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "GETAL", waarde: 45 }, "m²"),
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: TEGEL_VELD_ID,
      opties: [
        { naam: "Standaard wandtegel", prijs: 28 },
        { naam: "Vloertegel groot formaat", prijs: 45 },
        { naam: "Natuursteen", prijs: 85 },
      ],
    },
  ],
};

const DOUCHE_VELD_ID = "typeDouche";
const doucheOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-douche",
  naam: "Douche",
  categorie: "Badkamer",
  beschrijving: "Type douche(cabine).",
  icoon: "ShowerHead",
  bouwSlice: () => ({
    velden: [{ id: DOUCHE_VELD_ID, label: "Type douche", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: DOUCHE_VELD_ID }],
    afgeleideVariabelen: [],
    regels: [
      { id: "douche", label: "Douche", categorie: "MATERIAAL", type: "VAST", bedrag: { kind: "VARIABELE", naam: productKeuzePrijsVariabele(DOUCHE_VELD_ID) }, actief: true, intern: false, toonInUitsplitsing: true },
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: DOUCHE_VELD_ID,
      opties: [
        { naam: "Doucheput met glazen wand", prijs: 950 },
        { naam: "Douchecabine", prijs: 650 },
      ],
    },
  ],
};

const TOILET_VELD_ID = "typeToilet";
const toiletOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-toilet",
  naam: "Toilet",
  categorie: "Badkamer",
  beschrijving: "Type toilet.",
  icoon: "Bath",
  bouwSlice: () => ({
    velden: [{ id: TOILET_VELD_ID, label: "Type toilet", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: TOILET_VELD_ID }],
    afgeleideVariabelen: [],
    regels: [
      { id: "toilet", label: "Toilet", categorie: "MATERIAAL", type: "VAST", bedrag: { kind: "VARIABELE", naam: productKeuzePrijsVariabele(TOILET_VELD_ID) }, actief: true, intern: false, toonInUitsplitsing: true },
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: TOILET_VELD_ID,
      opties: [
        { naam: "Staand toilet", prijs: 285 },
        { naam: "Hangend toilet + inbouwreservoir", prijs: 495 },
      ],
    },
  ],
};

const WASTAFEL_VELD_ID = "typeWastafel";
const wastafelOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-wastafel",
  naam: "Wastafel",
  categorie: "Badkamer",
  beschrijving: "Type wastafel(meubel).",
  icoon: "Droplet",
  bouwSlice: () => ({
    velden: [{ id: WASTAFEL_VELD_ID, label: "Type wastafel", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: WASTAFEL_VELD_ID }],
    afgeleideVariabelen: [],
    regels: [
      { id: "wastafel", label: "Wastafel", categorie: "MATERIAAL", type: "VAST", bedrag: { kind: "VARIABELE", naam: productKeuzePrijsVariabele(WASTAFEL_VELD_ID) }, actief: true, intern: false, toonInUitsplitsing: true },
    ],
  }),
  materiaalKeuzes: [
    {
      veldId: WASTAFEL_VELD_ID,
      opties: [
        { naam: "Wastafel op meubel", prijs: 425 },
        { naam: "Dubbele wastafel op meubel", prijs: 795 },
      ],
    },
  ],
};

const montageOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-badkamer-montage",
  naam: "Montage",
  categorie: "Badkamer",
  beschrijving: "Uren montage (loodgieterswerk en plaatsing).",
  icoon: "Wrench",
  bouwSlice: () => ({
    velden: [{ id: "uren", label: "Geschatte montage-uren", soort: "NUMMER", verplicht: true, min: 0, standaardWaarde: 16 }],
    afgeleideVariabelen: [],
    regels: [perEenheidRegel({ id: "montage", label: "Montage", categorie: "ARBEID" }, { kind: "VARIABELE", naam: "uren" }, { kind: "GETAL", waarde: 55 }, "uur")],
  }),
  materiaalKeuzes: [],
};

export const BADKAMER_ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [
  tegelwerkOnderdeel,
  doucheOnderdeel,
  toiletOnderdeel,
  wastafelOnderdeel,
  montageOnderdeel,
];
