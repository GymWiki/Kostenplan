import { tuinaanlegTemplate } from "./tuinaanleg";
import { bestratingTemplate } from "./bestrating";
import { schuttingTemplate } from "./schutting";
import { schilderwerkTemplate } from "./schilderwerk";
import { kozijnenTemplate } from "./kozijnen";
import type { CalculatorTemplate } from "./types";

export type { CalculatorTemplate, TemplateMateriaalKeuze } from "./types";

// Templateregistry (Deel 26) — nieuwe templates komen er hier gewoon bij,
// zonder dat de rest van de app (het "kies een startpunt"-scherm, Fase 15)
// hoeft te weten hoeveel of welke er zijn.
export const CALCULATOR_TEMPLATES: CalculatorTemplate[] = [
  tuinaanlegTemplate,
  bestratingTemplate,
  schuttingTemplate,
  schilderwerkTemplate,
  kozijnenTemplate,
];

export function calculatorTemplateById(id: string): CalculatorTemplate | undefined {
  return CALCULATOR_TEMPLATES.find((t) => t.id === id);
}

// Voorbereid op Deel 27 (categorieën) — nu al afgeleid uit de templates
// zelf i.p.v. een aparte, los bij te houden lijst, zodat een nieuwe
// template automatisch in de juiste groep verschijnt.
export const TEMPLATE_CATEGORIEEN = [...new Set(CALCULATOR_TEMPLATES.map((t) => t.categorie))];
