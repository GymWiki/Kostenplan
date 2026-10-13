import { formatCenten } from "@/app/lib/pricing/format";

// Teksten voor de klant. Zonder zod, zodat de rekentool ze kan laden zonder extra bundel.
export const STANDAARD_MELDING_BUITEN = "Dit adres ligt buiten ons werkgebied. Neem gerust contact op, dan kijken we of we iets voor je kunnen doen.";

export const meldingBuiten = (eigen: string | null | undefined) => (eigen ?? "").trim() || STANDAARD_MELDING_BUITEN;

export const meldingMinimumTarief = (bedragInclCenten: number) => `Voor kleine klussen rekenen we een minimumtarief van ${formatCenten(bedragInclCenten)}.`;

export const meldingOnderMinimum = (bedragInclCenten: number) => `We nemen opdrachten aan vanaf ${formatCenten(bedragInclCenten)}.`;

export const meldingZoneNietMogelijk = "Op deze afstand kunnen we helaas niet werken. Neem gerust contact op, dan kijken we of we iets voor je kunnen doen.";

export const LABEL_BUITEN_WERKGEBIED = "Buiten werkgebied";
export const LABEL_ONDER_MINIMUM = "Onder minimum";
export const LABEL_NIET_GECONTROLEERD = "Werkgebied niet gecontroleerd";
