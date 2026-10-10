// Kostenplan richt zich uitsluitend op hoveniers. Niet-hovenier sjablonen
// (keuken, badkamer, kozijnen, schilderwerk) blijven in de code en database
// bestaan — bestaande tools die ze gebruiken werken ongewijzigd — maar worden
// niet meer aangeboden bij het aanmaken van een nieuwe rekentool.
// Zet op false om alle sjablonen weer te tonen.
export const ALLEEN_HOVENIER = true;

export const HOVENIER_CATEGORIE = "Hovenier";

export function isZichtbaarSjabloon(categorie: string): boolean {
  return !ALLEEN_HOVENIER || categorie === HOVENIER_CATEGORIE;
}

export const HOVENIER_DOELGROEP_SLUG = "hoveniers";

export function isZichtbareDoelgroep(slug: string): boolean {
  return !ALLEEN_HOVENIER || slug === HOVENIER_DOELGROEP_SLUG;
}

// Voorbeeld-rekentools op de marketingsite die bij hoveniers passen.
export function isZichtbareBranche(branche: string): boolean {
  return !ALLEEN_HOVENIER || ["Hovenier", "Schuttingbedrijf"].includes(branche);
}
