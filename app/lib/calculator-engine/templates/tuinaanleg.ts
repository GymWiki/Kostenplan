import type { CalculatorConfigData } from "../types";
import { afmetingenSubvariabelen } from "../fields";
import { delen, isWaar, perEenheidRegel, toeslagRegel, vastRegel } from "./helpers";
import type { CalculatorTemplate } from "./types";

const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen("afmeting", false);

function bouwConfig(): CalculatorConfigData {
  return {
    versie: 1,
    calculatorType: "PROJECT",
    velden: [
      { id: "afmeting", label: "Afmetingen van de tuin", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      { id: "grondwerkNodig", label: "Grondwerk nodig (ophogen/egaliseren)?", soort: "JA_NEE", verplicht: false },
      { id: "bestratingGewenst", label: "Bestrating gewenst?", soort: "JA_NEE", verplicht: false },
      { id: "beplantingGewenst", label: "Beplanting gewenst?", soort: "JA_NEE", verplicht: false },
      { id: "gazonAanleggen", label: "Nieuw gazon aanleggen?", soort: "JA_NEE", verplicht: false },
      { id: "oudeTuinAfvoeren", label: "Oude tuin/afval afvoeren?", soort: "JA_NEE", verplicht: false },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "arbeid", label: "Aanleg (arbeid)", categorie: "ARBEID" },
        delen({ kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "GETAL", waarde: 15 }),
        { kind: "GETAL", waarde: 48 },
        "uur"
      ),
      perEenheidRegel(
        { id: "grondwerk", label: "Grondwerk", categorie: "ARBEID", voorwaarde: isWaar("grondwerkNodig") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 12 },
        "m²"
      ),
      perEenheidRegel(
        { id: "bestrating", label: "Bestrating", categorie: "MATERIAAL", voorwaarde: isWaar("bestratingGewenst") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 65 },
        "m²"
      ),
      perEenheidRegel(
        { id: "beplanting", label: "Beplanting", categorie: "MATERIAAL", voorwaarde: isWaar("beplantingGewenst") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 18 },
        "m²"
      ),
      perEenheidRegel(
        { id: "gazon", label: "Gazon", categorie: "MATERIAAL", voorwaarde: isWaar("gazonAanleggen") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 9 },
        "m²"
      ),
      vastRegel({ id: "afvoer", label: "Afvoer oude tuin", categorie: "TRANSPORT", voorwaarde: isWaar("oudeTuinAfvoeren") }, 150),
      toeslagRegel({ id: "voorrijkosten", label: "Voorrijkosten", categorie: "TOESLAG" }, 45),
    ],
    stappen: [
      { id: "afmetingen", titel: "Afmetingen", veldIds: ["afmeting"] },
      {
        id: "wensen",
        titel: "Wensen",
        veldIds: ["grondwerkNodig", "bestratingGewenst", "beplantingGewenst", "gazonAanleggen", "oudeTuinAfvoeren"],
      },
    ],
    resultaatInstellingen: {
      weergave: "RANGE",
      afronding: "HEEL_EURO",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: "Dit is een indicatie op basis van gemiddelde tarieven. Na een kijkje ter plaatse volgt een definitieve offerte.",
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 15,
    },
  };
}

export const tuinaanlegTemplate: CalculatorTemplate = {
  id: "tuinaanleg",
  naam: "Tuinaanleg",
  categorie: "Hovenier",
  beschrijving: "Complete tuinaanleg: grondwerk, bestrating, beplanting en gazon in één berekening.",
  watHetBerekent: "Een prijsindicatie op basis van tuinoppervlakte en de gewenste onderdelen.",
  resterendWerk: "Pas de tarieven per m² aan naar jouw eigen prijzen — de rest werkt direct.",
  icoon: "Trees",
  calculatorType: "PROJECT",
  bouwConfig,
  materiaalKeuzes: [],
};
