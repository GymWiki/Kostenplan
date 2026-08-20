import type { CalculatorConfigData, DerivedVariable } from "../types";
import { afmetingenSubvariabelen, productKeuzePrijsVariabele } from "../fields";
import { isWaar, optellen, perEenheidRegel, vastRegel, vermenigvuldigen } from "./helpers";
import type { CalculatorTemplate } from "./types";

const AFMETING_VELD_ID = "afmeting";
const TYPE_BESTRATING_VELD_ID = "typeBestrating";
const { oppervlakte: OPPERVLAKTE_VAR, lengte: LENGTE_VAR, breedte: BREEDTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);
const OMTREK_VAR = "omtrek";

function bouwConfig(): CalculatorConfigData {
  const afgeleideVariabelen: DerivedVariable[] = [
    {
      id: OMTREK_VAR,
      label: "Omtrek",
      type: "NUMBER",
      expression: vermenigvuldigen({ kind: "GETAL", waarde: 2 }, optellen({ kind: "VARIABELE", naam: LENGTE_VAR }, { kind: "VARIABELE", naam: BREEDTE_VAR })),
    },
  ];

  return {
    versie: 1,
    calculatorType: "OPPERVLAKTE",
    velden: [
      { id: AFMETING_VELD_ID, label: "Afmetingen van het te bestraten oppervlak", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      {
        id: TYPE_BESTRATING_VELD_ID,
        label: "Welke bestrating wil je?",
        soort: "PRODUCT_KEUZE",
        verplicht: true,
        // Wordt bij het aanmaken van de tool vervangen door een echte
        // MaterialCategory-id, zie materiaalKeuzes hieronder en
        // instantieerTemplate() in app/lib/actions/tools.ts.
        materialCategoryId: TYPE_BESTRATING_VELD_ID,
      },
      { id: "oudeBestratingVerwijderen", label: "Oude bestrating verwijderen?", soort: "JA_NEE", verplicht: false },
      { id: "ondergrondVoorbereiden", label: "Nieuwe ondergrond/funderingslaag aanleggen?", soort: "JA_NEE", verplicht: false },
      { id: "opsluitbanden", label: "Opsluitbanden plaatsen?", soort: "JA_NEE", verplicht: false },
    ],
    afgeleideVariabelen,
    regels: [
      perEenheidRegel(
        { id: "materiaal", label: "Bestratingsmateriaal", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(TYPE_BESTRATING_VELD_ID) },
        "m²"
      ),
      perEenheidRegel(
        { id: "arbeid", label: "Bestraten (arbeid)", categorie: "ARBEID" },
        { kind: "DELEN", links: { kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, rechts: { kind: "GETAL", waarde: 10 } },
        { kind: "GETAL", waarde: 48 },
        "uur"
      ),
      perEenheidRegel(
        { id: "verwijderen", label: "Oude bestrating verwijderen", categorie: "TOESLAG", voorwaarde: isWaar("oudeBestratingVerwijderen") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 15 },
        "m²"
      ),
      perEenheidRegel(
        { id: "ondergrond", label: "Nieuwe ondergrond", categorie: "MATERIAAL", voorwaarde: isWaar("ondergrondVoorbereiden") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 22 },
        "m²"
      ),
      perEenheidRegel(
        { id: "opsluitbanden", label: "Opsluitbanden", categorie: "MATERIAAL", voorwaarde: isWaar("opsluitbanden") },
        { kind: "VARIABELE", naam: OMTREK_VAR },
        { kind: "GETAL", waarde: 28 },
        "meter"
      ),
      vastRegel({ id: "transport", label: "Transport", categorie: "TRANSPORT" }, 65),
    ],
    stappen: [
      { id: "afmetingen", titel: "Afmetingen & materiaal", veldIds: [AFMETING_VELD_ID, TYPE_BESTRATING_VELD_ID] },
      { id: "extras", titel: "Extra werkzaamheden", veldIds: ["oudeBestratingVerwijderen", "ondergrondVoorbereiden", "opsluitbanden"] },
    ],
    resultaatInstellingen: {
      weergave: "RANGE",
      afronding: "HEEL_EURO",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: null,
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    },
  };
}

export const bestratingTemplate: CalculatorTemplate = {
  id: "bestrating",
  naam: "Bestrating",
  categorie: "Stratenmaker",
  beschrijving: "Oppervlakte, materiaalkeuze en veelgevraagde extra's zoals verwijderen en opsluitbanden.",
  watHetBerekent: "Een prijsindicatie op basis van oppervlakte, gekozen bestrating en extra werkzaamheden.",
  resterendWerk: "Vul je eigen materiaalprijzen in bij de bestratingskeuze — de rest werkt direct.",
  icoon: "Grid3x3",
  calculatorType: "OPPERVLAKTE",
  bouwConfig,
  materiaalKeuzes: [
    {
      veldId: TYPE_BESTRATING_VELD_ID,
      opties: [
        { naam: "Betontegels", prijs: 38 },
        { naam: "Klinkers", prijs: 45 },
        { naam: "Natuursteen", prijs: 89 },
      ],
    },
  ],
};
