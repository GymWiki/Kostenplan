import { schilderwerkTemplate } from "../templates/schilderwerk";
import type { OnderdeelTemplate } from "./types";

// SCHILDERWERK (Deel 14 van de opdracht) — in tegenstelling tot TUIN zijn
// "Oppervlakte/Verf/Ondergrond/Lagen/Voorbereiding/Arbeid" hier geen
// zelfstandig te factureren onderdelen maar variabelen/regels binnen ÉÉN
// samenhangende berekening (een klant koopt niet apart "lagen" of
// "voorbereiding" los in — dat zijn factoren in de schilderwerk-prijs). Eén
// Onderdeel "Schilderwerk" dat alle zes aspecten dekt is daarom de juiste
// modellering, en hergebruikt de bestaande (versie-1) template letterlijk.

export const schilderwerkOnderdeel: OnderdeelTemplate = {
  id: "onderdeel-schilderwerk",
  naam: "Schilderwerk",
  categorie: "Schilderwerk",
  beschrijving: "Oppervlakte, verfkwaliteit, aantal lagen en voorbereiding in één berekening.",
  icoon: "PaintRoller",
  bouwSlice: () => {
    const c = schilderwerkTemplate.bouwConfig();
    return { velden: c.velden, afgeleideVariabelen: c.afgeleideVariabelen, regels: c.regels };
  },
  materiaalKeuzes: schilderwerkTemplate.materiaalKeuzes,
};

export const SCHILDERWERK_ONDERDEEL_TEMPLATES: OnderdeelTemplate[] = [schilderwerkOnderdeel];
