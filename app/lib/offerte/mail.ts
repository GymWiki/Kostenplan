import { berekenTotalen } from "./bereken";
import type { OfferteInhoud } from "./model";
import { formatCents, formatDatum } from "./weergave";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// E-mail aan de klant bij het versturen van een offerte, in de stijl van de
// hovenier (merkkleur, handelsnaam). De afzender is Kostenplan met de naam van
// de hovenier; antwoorden gaan rechtstreeks naar de hovenier (reply-to).
export function bouwOfferteMail({ inhoud, link, herinnering = false }: { inhoud: OfferteInhoud; link: string; herinnering?: boolean }): { onderwerp: string; tekst: string; html: string } {
  const a = inhoud.afzender;
  const t = berekenTotalen(inhoud);
  const totaal = t.toonIncl || t.kor ? formatCents(t.totaalIncl) : `${formatCents(t.totaalExcl)} excl. btw`;
  const naam = inhoud.klant.naam.trim();
  const aanhef = naam ? `Geachte ${naam},` : "Geachte heer/mevrouw,";
  const regel = herinnering
    ? `Onze offerte ${inhoud.nummer} is nog tot ${formatDatum(inhoud.geldigTot)} geldig. Hieronder kunt u de offerte nog eens bekijken en akkoord geven.`
    : `Hierbij ontvangt u onze offerte ${inhoud.nummer}${inhoud.onderwerp ? ` voor ${inhoud.onderwerp.charAt(0).toLowerCase()}${inhoud.onderwerp.slice(1)}` : ""}. U vindt de offerte als PDF in de bijlage${inhoud.bijlagen.length > 0 ? ", samen met onze algemene voorwaarden" : ""}. U kunt de offerte ook online bekijken en akkoord geven.`;
  const onderwerp = herinnering ? `Herinnering: offerte ${inhoud.nummer} van ${a.handelsnaam}` : `Offerte ${inhoud.nummer} van ${a.handelsnaam}`;
  const tekst = [
    aanhef,
    "",
    regel,
    "",
    `Totaal: ${totaal}`,
    `Geldig tot: ${formatDatum(inhoud.geldigTot)}`,
    "",
    `Offerte bekijken en akkoord geven: ${link}`,
    "",
    "Heeft u vragen? Reageer gerust op deze e-mail.",
    "",
    "Met vriendelijke groet,",
    a.contactNaam,
    [a.contactFunctie, a.handelsnaam].filter(Boolean).join(", "),
    [a.telefoon, a.email].filter(Boolean).join(" · "),
  ].join("\n");
  const kleur = /^#[0-9a-fA-F]{6}$/.test(a.kleur) ? a.kleur : "#15803d";
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f4f5f4;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
<div style="padding:18px 24px;border-bottom:3px solid ${kleur}">${a.logoUrl ? `<img src="${esc(a.logoUrl)}" alt="${esc(a.handelsnaam)}" style="max-height:44px;max-width:220px">` : `<span style="font-size:18px;font-weight:700;color:${kleur}">${esc(a.handelsnaam)}</span>`}</div>
<div style="padding:24px;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">${esc(aanhef)}</p>
<p style="margin:0 0 16px">${esc(regel)}</p>
<div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin:0 0 20px"><div style="font-size:13px;color:#6b7280">Offerte ${esc(inhoud.nummer)} · geldig tot ${esc(formatDatum(inhoud.geldigTot))}</div><div style="font-size:22px;font-weight:700;color:#111827;margin-top:2px">${esc(totaal)}</div></div>
<p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:${kleur};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Offerte bekijken</a></p>
<p style="margin:0 0 16px;color:#4b5563">Heeft u vragen? Reageer gerust op deze e-mail.</p>
<p style="margin:0">Met vriendelijke groet,<br><strong>${esc(a.contactNaam)}</strong><br><span style="color:#6b7280">${esc([a.contactFunctie, a.handelsnaam].filter(Boolean).join(", "))}<br>${esc([a.telefoon, a.email].filter(Boolean).join(" · "))}</span></p>
</div></div>
<p style="font-size:11px;color:#9ca3af;text-align:center;margin:12px 0 0">${esc(a.handelsnaam)}${a.kvkNummer ? ` · KvK ${esc(a.kvkNummer)}` : ""}</p>
</div></body></html>`;
  return { onderwerp, tekst, html };
}

// WhatsApp-link met een vooringevuld bericht (de hovenier kiest zelf het kanaal).
export function whatsappDeelLink(inhoud: OfferteInhoud, link: string, telefoon?: string): string {
  const naam = inhoud.klant.naam.trim();
  const bericht = `${naam ? `Dag ${naam}` : "Goedendag"}, hierbij mijn offerte ${inhoud.nummer} van ${inhoud.afzender.handelsnaam}. U kunt hem hier bekijken en akkoord geven: ${link}`;
  const nummer = telefoon ? telefoon.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "31") : "";
  return `https://wa.me/${nummer}?text=${encodeURIComponent(bericht)}`;
}
