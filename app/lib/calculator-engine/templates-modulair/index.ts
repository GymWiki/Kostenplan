import type { ModulaireCalculatorTemplate } from "./types";

export type { ModulaireCalculatorTemplate } from "./types";

// De vijf voorbeelddomeinen uit Deel 14 van de opdracht — elk bewijst dat
// dezelfde generieke engine een ander soort rekentool aankan. "Complete
// tuin" is bovendien letterlijk het voorbeeld uit Deel 7/11 van de opdracht.
export const MODULAIRE_CALCULATOR_TEMPLATES: ModulaireCalculatorTemplate[] = [
  {
    id: "modulair-complete-tuin",
    naam: "Complete tuin",
    categorie: "Hovenier",
    beschrijving: "Tuinaanleg opgebouwd uit losse onderdelen: bestrating, schutting, kunstgras, beplanting en grondwerk.",
    watHetBerekent: "Elk onderdeel telt zijn eigen prijs, samen één tuin-totaal.",
    resterendWerk: "Vul je eigen materiaalprijzen in per onderdeel, of verwijder onderdelen die je niet aanbiedt.",
    icoon: "Trees",
    onderdeelTemplateIds: [
      "onderdeel-bestrating",
      "onderdeel-schutting",
      "onderdeel-kunstgras",
      "onderdeel-beplanting",
      "onderdeel-grondwerk",
    ],
  },
  {
    id: "modulair-keuken",
    naam: "Keuken",
    categorie: "Keukenmonteur",
    beschrijving: "Keukenrenovatie opgebouwd uit opstelling, kasten, werkblad, apparatuur en montage.",
    watHetBerekent: "Elk onderdeel telt zijn eigen prijs, samen één keuken-totaal.",
    resterendWerk: "Vul je eigen prijzen per onderdeel in — de rest werkt direct.",
    icoon: "CookingPot",
    onderdeelTemplateIds: [
      "onderdeel-keukenopstelling",
      "onderdeel-kasten",
      "onderdeel-werkblad",
      "onderdeel-apparatuur",
      "onderdeel-keuken-montage",
    ],
  },
  {
    id: "modulair-badkamer",
    naam: "Badkamer",
    categorie: "Loodgieter",
    beschrijving: "Badkamerrenovatie opgebouwd uit tegelwerk, douche, toilet, wastafel en montage.",
    watHetBerekent: "Elk onderdeel telt zijn eigen prijs, samen één badkamer-totaal.",
    resterendWerk: "Vul je eigen prijzen per onderdeel in — de rest werkt direct.",
    icoon: "Bath",
    onderdeelTemplateIds: ["onderdeel-tegelwerk", "onderdeel-douche", "onderdeel-toilet", "onderdeel-wastafel", "onderdeel-badkamer-montage"],
  },
  {
    id: "modulair-kozijnen",
    naam: "Kozijnen compleet",
    categorie: "Timmerman",
    beschrijving: "Kozijnvervanging opgebouwd uit kozijn, glas, ventilatierooster, vensterbank en montage.",
    watHetBerekent: "Elk onderdeel telt zijn eigen prijs, samen één kozijnen-totaal.",
    resterendWerk: "Vul je eigen materiaal- en glasprijzen in — de rest werkt direct.",
    icoon: "AppWindow",
    onderdeelTemplateIds: ["onderdeel-kozijn", "onderdeel-glas", "onderdeel-ventilatierooster", "onderdeel-vensterbank", "onderdeel-kozijnen-montage"],
  },
  {
    id: "modulair-schilderwerk",
    naam: "Schilderwerk compleet",
    categorie: "Schilder",
    beschrijving: "Eén samenhangend schilderwerk-onderdeel: oppervlakte, verf, lagen en voorbereiding.",
    watHetBerekent: "Een vanaf-prijs op basis van oppervlakte, aantal lagen en gekozen verfkwaliteit.",
    resterendWerk: "Vul je eigen verfprijzen in — de rest werkt direct. Voeg later gerust meer onderdelen toe.",
    icoon: "PaintRoller",
    onderdeelTemplateIds: ["onderdeel-schilderwerk"],
  },
];

export function modulaireCalculatorTemplateById(id: string): ModulaireCalculatorTemplate | undefined {
  return MODULAIRE_CALCULATOR_TEMPLATES.find((t) => t.id === id);
}
