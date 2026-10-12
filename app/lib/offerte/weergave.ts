import { formatAantal as formatAantalGedeeld, formatCenten } from "@/app/lib/pricing/format";
import { RECHTSVORM_LABEL, heeftStatutaireGegevens } from "./gegevens";
import type { Adres, OfferteAfzender, OfferteInhoud } from "./model";

export const formatCents = formatCenten;

const datumFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
export function formatDatum(iso: string): string {
  const [j, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!j || !m || !d) return iso;
  return datumFmt.format(new Date(j, m - 1, d));
}
export const formatDatumTijd = (d: Date) => `${new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(d)} om ${new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(d)}`;

// "2026-W20" → "week 20 van 2026"; vrije tekst blijft zoals hij is.
export function formatWeek(v: string): string {
  const m = v.match(/^(\d{4})-W(\d{2})$/);
  return m ? `week ${Number(m[2])} van ${m[1]}` : v;
}

export const formatAantal = formatAantalGedeeld;

export const adresRegels = (a: Adres): string[] => [a.straat, [a.postcode, a.plaats].filter(Boolean).join(" ")].filter((x) => x.trim() !== "");

// Tekst in de voettekst van elke pagina (zonder paginanummering).
export function voettekstTekst(a: OfferteAfzender): string {
  const naam = a.rechtsvorm && heeftStatutaireGegevens(a.rechtsvorm) && a.statutaireNaam && a.statutaireNaam !== a.handelsnaam ? `${a.handelsnaam} (${a.statutaireNaam})` : a.handelsnaam;
  return [naam, a.kvkNummer ? `KvK ${a.kvkNummer}` : null, a.korActief ? null : a.btwId ? `Btw-id ${a.btwId}` : null, a.iban ? `IBAN ${a.iban}` : null, a.telefoon, a.email].filter(Boolean).join(" · ");
}
export const voetPaginaTekst = (i: Pick<OfferteInhoud, "nummer" | "versie">) => `Offerte ${i.nummer}${i.versie > 1 ? ` · versie ${i.versie}` : ""}`;

export function bestandsnaam(i: Pick<OfferteInhoud, "nummer" | "afzender">): string {
  return `Offerte ${i.nummer} – ${i.afzender.handelsnaam}.pdf`.replace(/[\\/:*?"<>|]/g, "");
}

export const rechtsvormTekst = (a: OfferteAfzender) =>
  heeftStatutaireGegevens(a.rechtsvorm) ? `${RECHTSVORM_LABEL[a.rechtsvorm]}${a.statutaireZetel ? ` te ${a.statutaireZetel}` : ""}` : "";

// Betaaltermijnen met bedragen; het laatste termijn neemt de afrondingsrest.
export function termijnBedragen(termijnen: { label: string; percentage: number }[], totaalCenten: number): { label: string; percentage: number; bedrag: number }[] {
  let rest = totaalCenten;
  return termijnen.map((t, i) => {
    const bedrag = i === termijnen.length - 1 ? rest : Math.round((totaalCenten * t.percentage) / 100);
    rest -= bedrag;
    return { ...t, bedrag };
  });
}
