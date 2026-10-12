import { berekenTotalen } from "./bereken";
import type { OfferteInhoud } from "./model";
import { formatCents, formatDatum } from "./weergave";

// De hovenier verstuurt de offerte zelf (eigen mail, deelmenu of WhatsApp). Dit zijn de
// standaardteksten daarvoor; ze zijn aanpasbaar in Profiel → Offertegegevens en nog eens in
// het scherm vóór het delen.
export const STANDAARD_DEELTEKST = `Geachte {naam},

Hierbij ontvangt u mijn offerte {nummer} voor {onderwerp}. U kunt de offerte hier bekijken, als PDF downloaden en direct akkoord geven:
{link}

De offerte is geldig tot {geldigTot}. Heeft u vragen? Laat het mij gerust weten.

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

export const STANDAARD_HERINNERINGSTEKST = `Geachte {naam},

Een vriendelijke herinnering aan mijn offerte {nummer} voor {onderwerp} ({totaal}). De offerte is nog geldig tot {geldigTot}. U kunt hem hier nog bekijken en akkoord geven:
{link}

Heeft u vragen of wilt u iets laten aanpassen? Laat het mij gerust weten.

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

export type BerichtWaarden = Record<"naam" | "nummer" | "onderwerp" | "totaal" | "geldigTot" | "handelsnaam" | "contactNaam" | "link", string>;

export function berichtWaarden(inhoud: OfferteInhoud, link: string): BerichtWaarden {
  const t = berekenTotalen(inhoud);
  const totaal = t.toonIncl || t.kor ? formatCents(t.totaalIncl) : `${formatCents(t.totaalExcl)} excl. btw`;
  const onderwerp = inhoud.onderwerp.trim();
  return {
    naam: inhoud.klant.naam.trim() || "heer/mevrouw",
    nummer: inhoud.nummer,
    onderwerp: onderwerp ? `${onderwerp.charAt(0).toLowerCase()}${onderwerp.slice(1)}` : "het besproken werk",
    totaal,
    geldigTot: formatDatum(inhoud.geldigTot),
    handelsnaam: inhoud.afzender.handelsnaam,
    contactNaam: inhoud.afzender.contactNaam,
    link,
  };
}

// Vult {plaatsaanduidingen}; onbekende aanduidingen blijven staan zodat de hovenier ze ziet.
export function vulSjabloon(tekst: string, w: BerichtWaarden): string {
  return tekst.replace(/\{(\w+)\}/g, (m, k: string) => (k in w ? w[k as keyof BerichtWaarden] : m));
}

export function bouwDeelBericht({ inhoud, link, sjabloon, herinnering = false }: { inhoud: OfferteInhoud; link: string; sjabloon?: string | null; herinnering?: boolean }): { onderwerp: string; tekst: string } {
  const w = berichtWaarden(inhoud, link);
  const basis = sjabloon && sjabloon.trim() ? sjabloon : herinnering ? STANDAARD_HERINNERINGSTEKST : STANDAARD_DEELTEKST;
  let tekst = vulSjabloon(basis, w);
  // Staat de link niet in een aangepaste tekst, dan voegen we hem toe: zonder link kan de klant niets.
  if (!tekst.includes(link)) tekst = `${tekst.trimEnd()}\n\n${link}`;
  const onderwerp = `${herinnering ? "Herinnering: offerte" : "Offerte"} ${inhoud.nummer}${inhoud.onderwerp.trim() ? ` – ${inhoud.onderwerp.trim()}` : ""}`;
  return { onderwerp, tekst };
}

export function mailtoLink({ naar, onderwerp, tekst }: { naar: string; onderwerp: string; tekst: string }): string {
  // Windows-mailclients willen CRLF; encodeURIComponent maakt er %0D%0A van.
  return `mailto:${encodeURIComponent(naar.trim())}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst.replace(/\r?\n/g, "\r\n"))}`;
}

// WhatsApp-link met vooringevuld bericht (met het telefoonnummer van de klant als dat bekend is).
export function whatsappDeelLink(tekst: string, telefoon?: string): string {
  const nummer = telefoon ? telefoon.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "31") : "";
  return `https://wa.me/${nummer}?text=${encodeURIComponent(tekst)}`;
}
