export type Testimonial = { tekst: string; naam: string; bedrijf: string; plaats?: string };

// TODO(Pieter): echte testimonials van hoveniers hier toevoegen (toestemming
// vragen voor naam en bedrijf). Zolang deze lijst leeg is, toont de sectie
// "Vertrouwen" alleen de feiten en staat er nergens een citaat.
export const TESTIMONIALS: Testimonial[] = [];
