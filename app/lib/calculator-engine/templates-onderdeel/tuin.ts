import { afmetingenSubvariabelen } from "../fields";
import { isWaar, perEenheidRegel, toeslagRegel, vastRegel } from "../templates/helpers";
import { bestratingTemplate } from "../templates/bestrating";
import { schuttingTemplate } from "../templates/schutting";
import type { OnderdeelTemplate } from "./types";

// TUIN (Deel 14 van de opdracht) — bewijst dat de generieke engine een
// "Complete tuin" kan samenstellen uit meerdere zelfstandige Onderdelen.
// Bestrating/Schutting hergebruiken hun bestaande (versie-1) template
// letterlijk — hetzelfde velden/regels-recept, nu als Onderdeel-slice i.p.v.
// als volledige platte calculator (Deel 16 van de opdracht: "bouw geen
// tweede concurrerende prijsengine" geldt ook voor templates zelf).

const bestratingOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-bestrating",
  naam: "Bestrating",
  categorie: "Tuin",
  beschrijving: "Oppervlakte, materiaalkeuze en extra's zoals verwijderen en opsluitbanden.",
  icoon: "Grid3x3",
  bouwSlice: () => {
    const c = bestratingTemplate.bouwConfig();
    return { velden: c.velden, afgeleideVariabelen: c.afgeleideVariabelen, regels: c.regels };
  },
  materiaalKeuzes: bestratingTemplate.materiaalKeuzes,
};

const schuttingOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-schutting",
  naam: "Schutting",
  categorie: "Tuin",
  beschrijving: "Lengte, materiaalkeuze, hoeken, poort en bereikbaarheid.",
  icoon: "Fence",
  bouwSlice: () => {
    const c = schuttingTemplate.bouwConfig();
    return { velden: c.velden, afgeleideVariabelen: c.afgeleideVariabelen, regels: c.regels };
  },
  materiaalKeuzes: schuttingTemplate.materiaalKeuzes,
};

const AFMETING_VELD_ID = "afmeting";
const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);

const kunstgrasOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-kunstgras",
  naam: "Kunstgras",
  categorie: "Tuin",
  beschrijving: "Oppervlakte kunstgras inclusief aanleg.",
  icoon: "Sprout",
  bouwSlice: () => ({
    velden: [{ id: AFMETING_VELD_ID, label: "Oppervlakte kunstgras", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false }],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel({ id: "materiaal", label: "Kunstgras", categorie: "MATERIAAL" }, { kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "GETAL", waarde: 32 }, "m²"),
      perEenheidRegel({ id: "aanleg", label: "Aanleg (arbeid)", categorie: "ARBEID" }, { kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "GETAL", waarde: 14 }, "m²"),
    ],
  }),
  materiaalKeuzes: [],
};

const beplantingOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-beplanting",
  naam: "Beplanting",
  categorie: "Tuin",
  beschrijving: "Aantal planten/struiken inclusief plantwerk.",
  icoon: "Flower2",
  bouwSlice: () => ({
    velden: [{ id: "aantalPlanten", label: "Aantal planten/struiken", soort: "AANTAL", verplicht: true, min: 0 }],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "materiaal", label: "Planten", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: "aantalPlanten" },
        { kind: "GETAL", waarde: 18 },
        "stuk"
      ),
      perEenheidRegel(
        { id: "plantwerk", label: "Plantwerk (arbeid)", categorie: "ARBEID" },
        { kind: "VARIABELE", naam: "aantalPlanten" },
        { kind: "GETAL", waarde: 6 },
        "stuk"
      ),
    ],
  }),
  materiaalKeuzes: [],
};

const grondwerkOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-grondwerk",
  naam: "Grondwerk",
  categorie: "Tuin",
  beschrijving: "Egaliseren/ophogen en afvoer van grond.",
  icoon: "Shovel",
  bouwSlice: () => ({
    velden: [
      { id: AFMETING_VELD_ID, label: "Oppervlakte", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      { id: "afvoerGrond", label: "Grond afvoeren?", soort: "JA_NEE", verplicht: false },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel({ id: "grondwerk", label: "Egaliseren/ophogen", categorie: "ARBEID" }, { kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "GETAL", waarde: 12 }, "m²"),
      vastRegel({ id: "afvoer", label: "Afvoer grond", categorie: "TRANSPORT", voorwaarde: isWaar("afvoerGrond") }, 150),
    ],
  }),
  materiaalKeuzes: [],
};

const poortOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-poort",
  naam: "Poort",
  categorie: "Tuin",
  beschrijving: "Een losse tuinpoort, onafhankelijk van de schutting.",
  icoon: "DoorOpen",
  bouwSlice: () => ({
    velden: [
      {
        id: "typePoort",
        label: "Type poort",
        soort: "DROPDOWN",
        verplicht: true,
        standaardWaarde: "enkel",
        opties: [
          { waarde: "enkel", label: "Enkele poort" },
          { waarde: "dubbel", label: "Dubbele poort" },
        ],
      },
      { id: "elektrisch", label: "Elektrische opener?", soort: "JA_NEE", verplicht: false },
    ],
    afgeleideVariabelen: [],
    regels: [
      vastRegel({ id: "enkel", label: "Enkele poort", categorie: "MATERIAAL", voorwaarde: { kind: "GELIJK_AAN", links: { kind: "VARIABELE", naam: "typePoort" }, rechts: { kind: "TEKST", waarde: "enkel" } } }, 350),
      vastRegel({ id: "dubbel", label: "Dubbele poort", categorie: "MATERIAAL", voorwaarde: { kind: "GELIJK_AAN", links: { kind: "VARIABELE", naam: "typePoort" }, rechts: { kind: "TEKST", waarde: "dubbel" } } }, 650),
      toeslagRegel({ id: "elektrisch", label: "Elektrische opener", categorie: "TOESLAG", voorwaarde: isWaar("elektrisch") }, 425),
    ],
  }),
  materiaalKeuzes: [],
};

export const TUIN_ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [
  bestratingOnderdeel,
  schuttingOnderdeel,
  kunstgrasOnderdeel,
  beplantingOnderdeel,
  grondwerkOnderdeel,
  poortOnderdeel,
];
