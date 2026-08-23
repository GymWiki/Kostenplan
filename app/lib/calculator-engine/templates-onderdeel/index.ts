import { TUIN_ONDERDEEL_TEMPLATES } from "./tuin";
import { KEUKEN_ONDERDEEL_TEMPLATES } from "./keuken";
import { BADKAMER_ONDERDEEL_TEMPLATES } from "./badkamer";
import { KOZIJNEN_ONDERDEEL_TEMPLATES } from "./kozijnen";
import { SCHILDERWERK_ONDERDEEL_TEMPLATES } from "./schilderwerk";
import type { OnderdeelTemplate } from "./types";

export type { OnderdeelTemplate, OnderdeelSlice } from "./types";

// Onderdeel-templateregistry (Deel 14 van de opdracht: "eerste
// voorbeeldonderdelen") — vijf domeinen, elk gebouwd op exact dezelfde
// generieke engine, om te bewijzen dat er geen branche-specifieke code
// nodig is (Deel 4: "prijsregels mogen niet hardcoded zijn voor specifieke
// branches" geldt hier onverkort: alle vijf hieronder zijn puur data).
export const ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [
  ...TUIN_ONDERDEEL_TEMPLATES,
  ...KEUKEN_ONDERDEEL_TEMPLATES,
  ...BADKAMER_ONDERDEEL_TEMPLATES,
  ...KOZIJNEN_ONDERDEEL_TEMPLATES,
  ...SCHILDERWERK_ONDERDEEL_TEMPLATES,
];

export function onderdeelTemplateById(id: string): OnderdeelTemplate | undefined {
  return ONDERDEEL_TEMPLATES.find((t) => t.id === id);
}

export const ONDERDEEL_TEMPLATE_CATEGORIEEN = [...new Set(ONDERDEEL_TEMPLATES.map((t) => t.categorie))];
