import type { HovenierPreset } from "./types";

// ---------------------------------------------------------------------------
// Hovenier-presets — de centrale bron voor alle startwerkzaamheden.
//
// ALLE GETALLEN HIERIN ZIJN PLACEHOLDERS. In de UI worden ze altijd getoond
// als "voorbeeld — pas aan naar jouw prijzen" (zie VOORBEELD_LABEL).
// ---------------------------------------------------------------------------

export const VOORBEELD_LABEL = "voorbeeld — pas aan naar jouw prijzen";

export const HOVENIER_PRESETS: HovenierPreset[] = [
  {
    id: "schutting",
    naam: "Schutting",
    icoon: "Fence",
    rekenmethode: "strekkende-meter",
    eenheid: "m1",
    // TODO(Pieter): echte materiaalprijzen per strekkende meter invullen
    materialen: [
      { naam: "Douglas schutting", prijs: 85 },
      { naam: "Hardhouten schutting", prijs: 135 },
      { naam: "Betonnen schutting", prijs: 110 },
    ],
    // TODO(Pieter): echte productiviteit (m¹ per dag) invullen
    productiviteitPerDag: 10,
    productiviteitVraag: "Hoeveel meter schutting plaats je per dag?",
    voorbeeldHoeveelheid: 15,
    uitleg: "Houten of betonnen schutting, berekend per strekkende meter.",
  },
  {
    id: "bestrating",
    naam: "Bestrating / terras",
    icoon: "BrickWall",
    rekenmethode: "lengte-breedte",
    eenheid: "m2",
    // TODO(Pieter): echte materiaalprijzen per m² invullen
    materialen: [
      { naam: "Betontegel 60x60", prijs: 45 },
      { naam: "Klinkers", prijs: 55 },
      { naam: "Keramische tegel", prijs: 75 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 20,
    productiviteitVraag: "Hoeveel m² leg je per dag?",
    voorbeeldHoeveelheid: 20,
    uitleg: "Terras, oprit of pad. De klant vult lengte en breedte in.",
  },
  {
    id: "graszoden",
    naam: "Graszoden",
    icoon: "Sprout",
    rekenmethode: "m2",
    eenheid: "m2",
    // TODO(Pieter): echte materiaalprijzen per m² invullen
    materialen: [
      { naam: "Standaard graszoden", prijs: 9 },
      { naam: "Sport- en speelgazon zoden", prijs: 12 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 60,
    productiviteitVraag: "Hoeveel m² graszoden leg je per dag?",
    voorbeeldHoeveelheid: 40,
    uitleg: "Gazon aanleggen met graszoden, berekend per m².",
  },
  {
    id: "kunstgras",
    naam: "Kunstgras",
    icoon: "Layers",
    rekenmethode: "m2",
    eenheid: "m2",
    // TODO(Pieter): echte materiaalprijzen per m² invullen
    materialen: [
      { naam: "Kunstgras 30 mm", prijs: 28 },
      { naam: "Kunstgras 40 mm", prijs: 38 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 30,
    productiviteitVraag: "Hoeveel m² kunstgras leg je per dag?",
    voorbeeldHoeveelheid: 30,
    uitleg: "Kunstgras leggen op een voorbereide ondergrond, per m².",
  },
  {
    id: "vlonder",
    naam: "Vlonder",
    icoon: "Logs",
    rekenmethode: "lengte-breedte",
    eenheid: "m2",
    // TODO(Pieter): echte materiaalprijzen per m² invullen
    materialen: [
      { naam: "Douglas vlonder", prijs: 85 },
      { naam: "Hardhouten vlonder", prijs: 140 },
      { naam: "Composiet vlonder", prijs: 120 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 12,
    productiviteitVraag: "Hoeveel m² vlonder leg je per dag?",
    voorbeeldHoeveelheid: 16,
    uitleg: "Houten of composiet vlonder. De klant vult lengte en breedte in.",
  },
  {
    id: "haag-beplanting",
    naam: "Haag / beplanting",
    icoon: "Shrub",
    rekenmethode: "strekkende-meter",
    eenheid: "m1",
    // TODO(Pieter): echte materiaalprijzen per strekkende meter invullen
    materialen: [
      { naam: "Beukenhaag", prijs: 35 },
      { naam: "Laurierhaag", prijs: 45 },
      { naam: "Coniferenhaag", prijs: 30 },
    ],
    // TODO(Pieter): echte productiviteit (m¹ per dag) invullen
    productiviteitPerDag: 25,
    productiviteitVraag: "Hoeveel meter haag plant je per dag?",
    voorbeeldHoeveelheid: 12,
    uitleg: "Haag of border aanplanten, berekend per strekkende meter.",
  },
  {
    id: "grondwerk-afvoer",
    naam: "Grondwerk & afvoer",
    icoon: "Shovel",
    rekenmethode: "m2",
    eenheid: "m2",
    // TODO(Pieter): echte prijzen per m² invullen
    materialen: [
      { naam: "Afvoer grond / puin", prijs: 14 },
      { naam: "Aanvullen met zand", prijs: 10 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 40,
    productiviteitVraag: "Hoeveel m² grondwerk verzet je per dag?",
    voorbeeldHoeveelheid: 30,
    uitleg: "Afgraven, ophogen en grond of puin afvoeren, per m².",
  },
  {
    id: "boom-planten",
    naam: "Boom planten",
    icoon: "TreeDeciduous",
    rekenmethode: "stuks",
    eenheid: "stuks",
    // TODO(Pieter): echte materiaalprijzen per boom invullen
    materialen: [
      { naam: "Boom 200 cm", prijs: 120 },
      { naam: "Boom 300 cm", prijs: 220 },
      { naam: "Meerstammige boom", prijs: 350 },
    ],
    // TODO(Pieter): echte productiviteit (bomen per dag) invullen
    productiviteitPerDag: 8,
    productiviteitVraag: "Hoeveel bomen plant je per dag?",
    voorbeeldHoeveelheid: 3,
    uitleg: "Bomen leveren en planten, berekend per stuk.",
  },
  {
    id: "tuinonderhoud",
    naam: "Tuinonderhoud",
    icoon: "Scissors",
    rekenmethode: "m2",
    eenheid: "m2",
    // TODO(Pieter): echte prijzen per m² invullen
    materialen: [
      { naam: "Onderhoud per bezoek (basis)", prijs: 2 },
      { naam: "Onderhoud per bezoek (uitgebreid)", prijs: 3.5 },
    ],
    // TODO(Pieter): echte productiviteit (m² per dag) invullen
    productiviteitPerDag: 150,
    productiviteitVraag: "Hoeveel m² tuin onderhoud je per dag?",
    voorbeeldHoeveelheid: 100,
    uitleg: "Snoeien, wieden en opruimen, berekend per m² tuin.",
  },
];
