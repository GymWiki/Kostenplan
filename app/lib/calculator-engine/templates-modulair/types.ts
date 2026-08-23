// ---------------------------------------------------------------------------
// Tool-brede modulaire templates (Levering B v2, Deel 7 van de opdracht) —
// een snelstart die meteen meerdere Onderdelen samenstelt (bijv. "Complete
// tuin" = Bestrating + Schutting + Kunstgras + Beplanting + Grondwerk).
// Verwijst naar Onderdeel-templates via hun id (../templates-onderdeel) i.p.v.
// ze te dupliceren — één plek per Onderdeel-definitie, ook wanneer meerdere
// Tool-templates 'm zouden willen hergebruiken.
// ---------------------------------------------------------------------------

export type ModulaireCalculatorTemplate = {
  id: string;
  naam: string;
  categorie: string;
  beschrijving: string;
  watHetBerekent: string;
  resterendWerk: string;
  icoon: string;
  onderdeelTemplateIds: string[];
};
