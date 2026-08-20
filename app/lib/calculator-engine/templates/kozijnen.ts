import type { CalculatorConfigData } from "../types";
import { afmetingenSubvariabelen, productKeuzePrijsVariabele } from "../fields";
import { isGelijkAanTekst, isWaar, perEenheidRegel, toeslagRegel } from "./helpers";
import type { CalculatorTemplate } from "./types";

// Het eerste, meer geavanceerde configurator-bewijs (Deel 25 punt 5): twee
// onafhankelijke PRODUCT_KEUZE-velden (materiaal + glas) met elk hun eigen
// prijs per m², plus een kleurtoeslag en losse extra's — allemaal met
// dezelfde generieke bouwstenen als de eenvoudigere templates hierboven.
// Geen nieuwe engine-functionaliteit nodig om dit te bouwen.

const AFMETING_VELD_ID = "afmeting";
const MATERIAAL_VELD_ID = "materiaal";
const GLAS_VELD_ID = "glasType";
const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);

function bouwConfig(): CalculatorConfigData {
  return {
    versie: 1,
    calculatorType: "CONFIGURATOR",
    velden: [
      {
        id: "typeKozijn",
        label: "Type kozijn",
        soort: "DROPDOWN",
        verplicht: true,
        standaardWaarde: "draaikiepraam",
        opties: [
          { waarde: "draaikiepraam", label: "Draaikiepraam" },
          { waarde: "vastraam", label: "Vast raam" },
          { waarde: "deurkozijn", label: "Deurkozijn" },
        ],
      },
      { id: AFMETING_VELD_ID, label: "Afmetingen van het kozijn", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      { id: MATERIAAL_VELD_ID, label: "Materiaal", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: MATERIAAL_VELD_ID },
      { id: GLAS_VELD_ID, label: "Glassoort", soort: "PRODUCT_KEUZE", verplicht: true, materialCategoryId: GLAS_VELD_ID },
      {
        id: "kleur",
        label: "Kleur",
        soort: "DROPDOWN",
        verplicht: true,
        standaardWaarde: "wit",
        opties: [
          { waarde: "wit", label: "Wit" },
          { waarde: "crème", label: "Crème" },
          { waarde: "antraciet", label: "Antraciet (RAL 7016)" },
        ],
      },
      { id: "hordeur", label: "Hor toevoegen?", soort: "JA_NEE", verplicht: false },
      { id: "montage", label: "Inclusief montage?", soort: "JA_NEE", verplicht: true, standaardWaarde: true },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "materiaalkozijn", label: "Kozijnmateriaal", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(MATERIAAL_VELD_ID) },
        "m²"
      ),
      perEenheidRegel(
        { id: "glas", label: "Beglazing", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(GLAS_VELD_ID) },
        "m²"
      ),
      toeslagRegel({ id: "kleurtoeslag", label: "RAL-kleur", categorie: "TOESLAG", voorwaarde: isGelijkAanTekst("kleur", "antraciet") }, 35),
      toeslagRegel({ id: "hor", label: "Hor", categorie: "TOESLAG", voorwaarde: isWaar("hordeur") }, 65),
      perEenheidRegel(
        { id: "montage", label: "Montage", categorie: "ARBEID", voorwaarde: isWaar("montage") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 95 },
        "m²"
      ),
    ],
    stappen: [
      { id: "kozijn", titel: "Kozijn", veldIds: ["typeKozijn", AFMETING_VELD_ID] },
      { id: "materialen", titel: "Materiaal & glas", veldIds: [MATERIAAL_VELD_ID, GLAS_VELD_ID, "kleur"] },
      { id: "extras", titel: "Extra's", veldIds: ["hordeur", "montage"] },
    ],
    resultaatInstellingen: {
      weergave: "UITGEBREID",
      afronding: "HEEL_EURO",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: "Prijs per kozijn. Bij meerdere kozijnen: vraag een aanvraag aan per kozijn of neem contact op voor een totaalofferte.",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    },
  };
}

export const kozijnenTemplate: CalculatorTemplate = {
  id: "kozijnen",
  naam: "Kozijnen",
  categorie: "Timmerman",
  beschrijving: "De meest uitgebreide template: materiaal, glassoort, kleur en montage in één configurator.",
  watHetBerekent: "Een gedetailleerde kostenuitsplitsing per kozijn, op basis van afmetingen, materiaal, glas en extra's.",
  resterendWerk: "Vul je eigen materiaal- en glasprijzen in — de rest, inclusief de kostenuitsplitsing, werkt direct.",
  icoon: "AppWindow",
  calculatorType: "CONFIGURATOR",
  bouwConfig,
  materiaalKeuzes: [
    {
      veldId: MATERIAAL_VELD_ID,
      opties: [
        { naam: "Kunststof", prijs: 280 },
        { naam: "Aluminium", prijs: 420 },
        { naam: "Hout", prijs: 380 },
      ],
    },
    {
      veldId: GLAS_VELD_ID,
      opties: [
        { naam: "Dubbel glas (HR++)", prijs: 45 },
        { naam: "Triple glas", prijs: 85 },
      ],
    },
  ],
};
