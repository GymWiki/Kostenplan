import type { OfferteInhoud } from "./model";
import { voetPaginaTekst, voettekstTekst } from "./weergave";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Voettekst van elke pagina: bedrijfsgegevens en "Offerte 2026-0012 · Pagina 1 van 2".
export function footerTemplate(inhoud: Pick<OfferteInhoud, "nummer" | "versie" | "afzender">): string {
  return `<div style="width:100%;box-sizing:border-box;padding:0 20mm;font-family:Arial,Helvetica,sans-serif;font-size:7px;line-height:1.4;color:#6b7280;text-align:center">
<div style="border-top:0.5px solid #d1d5db;padding-top:5px">${esc(voettekstTekst(inhoud.afzender))}${inhoud.afzender.korActief ? ` · ${esc(inhoud.afzender.korTekst)}` : ""}</div>
<div style="color:#9ca3af;margin-top:2px">${esc(voetPaginaTekst(inhoud))} · Pagina <span class="pageNumber"></span> van <span class="totalPages"></span></div></div>`;
}
