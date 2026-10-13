import { factuurTotalen } from "./totalen";
import type { FactuurInhoud } from "./model";

// Export van facturen voor de boekhouder: CSV (één regel per factuur, btw per tarief, betaald, open) en UBL 2.1 (per factuur).
// Kostenplan is geen boekhoudpakket; dit is een uitwisselbestand, geen administratie.

export type ExportFactuur = {
  nummer: string;
  type: string;
  status: string;
  inhoud: FactuurInhoud;
  betaaldCenten: number;
  gecrediteerdCenten: number;
};

const komma = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const cel = (v: string | number) => {
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const datum = (iso: string) => (iso ? iso.split("-").reverse().join("-") : "");

// Elk tarief dat voorkomt krijgt zijn eigen kolommen (grondslag en btw); 0, 9 en 21 staan er altijd.
export function btwTarieven(rijen: ExportFactuur[]): number[] {
  const set = new Set<number>([0, 9, 21]);
  for (const r of rijen) for (const g of factuurTotalen(r.inhoud).btwGroepen) set.add(g.tarief);
  return [...set].sort((a, b) => a - b);
}

export function factuurCsv(rijen: ExportFactuur[]): string {
  const tarieven = btwTarieven(rijen);
  const kop = ["Nummer", "Soort", "Status", "Factuurdatum", "Vervaldatum", "Uitvoering", "Klant", "Klant btw-id", "Btw verlegd", "Offerte", "Creditnota bij", ...tarieven.flatMap((t) => [`Grondslag ${t}%`, `Btw ${t}%`]), "Totaal excl. btw", "Totaal btw", "Totaal incl. btw", "Betaald", "Gecrediteerd", "Openstaand"];
  const regels = rijen.map((r) => {
    const t = factuurTotalen(r.inhoud);
    const f = r.inhoud.factuur;
    const k = r.inhoud.klant;
    const open = r.type === "CREDITNOTA" ? 0 : Math.max(0, t.totaalIncl - r.betaaldCenten - r.gecrediteerdCenten);
    return [
      r.nummer,
      f.soort,
      r.status,
      datum(f.factuurdatum),
      datum(f.vervaldatum),
      [f.uitvoeringVan, f.uitvoeringTot].filter(Boolean).map(datum).join(" t/m "),
      k.bedrijfsnaam || k.naam,
      f.klantBtwId,
      f.btwModus === "verlegd" ? "ja" : "nee",
      f.offerteNummer,
      f.creditVoor?.nummer ?? "",
      ...tarieven.flatMap((tarief) => {
        const g = t.btwGroepen.find((x) => x.tarief === tarief);
        return [komma(g?.grondslag ?? 0), komma(g?.btw ?? 0)];
      }),
      komma(t.totaalExcl),
      komma(t.totaalBtw),
      komma(t.totaalIncl),
      komma(r.betaaldCenten),
      komma(r.gecrediteerdCenten),
      komma(open),
    ].map(cel).join(";");
  });
  // BOM zodat Excel de tekens goed leest.
  return "﻿" + [kop.map(cel).join(";"), ...regels].join("\r\n") + "\r\n";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bedrag = (c: number) => (c / 100).toFixed(2);

// Basis-UBL 2.1 (Invoice of CreditNote). Geen gevalideerd Peppol-bestand: bedoeld voor import in boekhoudpakketten.
export function factuurUbl(r: ExportFactuur): string {
  const i = r.inhoud;
  const f = i.factuur;
  const credit = f.soort === "creditnota";
  const t = factuurTotalen(i);
  const teken = credit ? -1 : 1; // UBL gebruikt positieve bedragen in een CreditNote
  const root = credit ? "CreditNote" : "Invoice";
  const lijnTag = credit ? "CreditNoteLine" : "InvoiceLine";
  const aantalTag = credit ? "CreditedQuantity" : "InvoicedQuantity";
  const a = i.afzender;
  const k = i.klant;
  const verlegd = f.btwModus === "verlegd";
  const regels = i.secties.flatMap((s) => s.regels).filter((x) => x.type !== "tekst");
  const adres = (straat: string, postcode: string, plaats: string) => `<cac:PostalAddress><cbc:StreetName>${esc(straat)}</cbc:StreetName><cbc:CityName>${esc(plaats)}</cbc:CityName><cbc:PostalZone>${esc(postcode)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>NL</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`;
  const btwCat = (tarief: number) => (verlegd ? "AE" : a.korActief || tarief === 0 ? "Z" : "S");
  const lijnen = regels
    .map((x, n) => {
      const uitk = t.regels[x.id];
      const excl = uitk?.excl ?? 0;
      return `<cac:${lijnTag}><cbc:ID>${n + 1}</cbc:ID><cbc:${aantalTag} unitCode="C62">${x.aantal}</cbc:${aantalTag}><cbc:LineExtensionAmount currencyID="EUR">${bedrag(teken * excl)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${esc(x.omschrijving)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${btwCat(x.btw)}</cbc:ID><cbc:Percent>${verlegd || a.korActief ? 0 : x.btw}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">${bedrag(Math.abs(x.prijsCenten))}</cbc:PriceAmount></cac:Price></cac:${lijnTag}>`;
    })
    .join("");
  const subtotalen = t.btwGroepen
    .map((g) => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${bedrag(teken * g.grondslag)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${bedrag(teken * g.btw)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${btwCat(g.tarief)}</cbc:ID><cbc:Percent>${verlegd || a.korActief ? 0 : g.tarief}</cbc:Percent>${verlegd ? "<cbc:TaxExemptionReason>Btw verlegd</cbc:TaxExemptionReason>" : ""}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`)
    .join("");
  const naamKlant = k.bedrijfsnaam || k.naam;
  return `<?xml version="1.0" encoding="UTF-8"?>
<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:ID>${esc(r.nummer)}</cbc:ID><cbc:IssueDate>${f.factuurdatum}</cbc:IssueDate>${credit ? "" : `<cbc:DueDate>${f.vervaldatum}</cbc:DueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>`}<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>${credit && f.creditVoor ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${esc(f.creditVoor.nummer)}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>` : ""}<cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>${esc(a.handelsnaam)}</cbc:Name></cac:PartyName>${adres(a.adresRegel, a.postcode, a.plaats)}${a.korActief ? "" : `<cac:PartyTaxScheme><cbc:CompanyID>${esc(a.btwId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`}<cac:PartyLegalEntity><cbc:RegistrationName>${esc(a.statutaireNaam || a.handelsnaam)}</cbc:RegistrationName><cbc:CompanyID schemeID="0106">${esc(a.kvkNummer)}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>${esc(naamKlant)}</cbc:Name></cac:PartyName>${adres(k.adres.straat, k.adres.postcode, k.adres.plaats)}${f.klantBtwId ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(f.klantBtwId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}<cac:PartyLegalEntity><cbc:RegistrationName>${esc(naamKlant)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty><cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode><cbc:PaymentID>${esc(r.nummer)}</cbc:PaymentID><cac:PayeeFinancialAccount><cbc:ID>${esc(a.iban.replace(/\s/g, ""))}</cbc:ID><cbc:Name>${esc(a.ibanTenaamstelling || a.handelsnaam)}</cbc:Name></cac:PayeeFinancialAccount></cac:PaymentMeans><cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${bedrag(teken * t.totaalBtw)}</cbc:TaxAmount>${subtotalen}</cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${bedrag(teken * t.totaalExcl)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">${bedrag(teken * t.totaalExcl)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${bedrag(teken * t.totaalIncl)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">${bedrag(teken * t.totaalIncl)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lijnen}</${root}>
`;
}
