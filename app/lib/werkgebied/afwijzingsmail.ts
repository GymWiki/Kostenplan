import { renderTemplate } from "@/app/lib/sjabloon/render";
import { STANDAARD_MELDING_BUITEN } from "./teksten";

// De tekst van de optionele afwijzingsmail. {naam} en {bedrijf} worden ingevuld; leeg = de standaardtekst.
export const STANDAARD_AFWIJZING_ONDERWERP = "Je aanvraag bij {bedrijf}";
export const STANDAARD_AFWIJZING_TEKST = `Beste {naam},\n\nBedankt voor je aanvraag. ${STANDAARD_MELDING_BUITEN}\n\nMet vriendelijke groet,\n{bedrijf}`;

const vul = (t: string, naam: string, bedrijf: string) => renderTemplate(t, { naam, bedrijf });

export function bouwAfwijzing(instellingen: { onderwerp: string; tekst: string }, naam: string, bedrijf: string): { onderwerp: string; tekst: string } {
  return {
    onderwerp: vul(instellingen.onderwerp.trim() || STANDAARD_AFWIJZING_ONDERWERP, naam, bedrijf),
    tekst: vul(instellingen.tekst.trim() || STANDAARD_AFWIJZING_TEKST, naam, bedrijf),
  };
}
