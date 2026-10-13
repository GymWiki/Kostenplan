import { describe, expect, it } from "vitest";
import { factuurCsv, factuurUbl, type ExportFactuur } from "./export";
import { factuurTotalen } from "./totalen";
import { creditnotaUitFactuur } from "./maak";
import { factuurInhoud, regel } from "./test-helpers";

const metNummer = (inhoud: ReturnType<typeof factuurInhoud>, nummer: string) => ({ ...inhoud, nummer, factuur: { ...inhoud.factuur, nummer } });
const rij = (nummer: string, inhoud: ReturnType<typeof factuurInhoud>, extra: Partial<ExportFactuur> = {}): ExportFactuur => ({ nummer, type: inhoud.factuur.soort === "creditnota" ? "CREDITNOTA" : "FACTUUR", status: "VERSTUURD", inhoud: metNummer(inhoud, nummer), betaaldCenten: 0, gecrediteerdCenten: 0, ...extra });

// "1.234,56" → centen
const naarCenten = (s: string) => Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100);
const lees = (csv: string) => {
  const [kop, ...regels] = csv.replace("﻿", "").trim().split("\r\n").map((r) => r.split(";"));
  return regels.map((r) => Object.fromEntries(kop.map((k, i) => [k, r[i]])));
};

describe("factuur-export", () => {
  const a = rij("F2026-0001", factuurInhoud(), { betaaldCenten: 50000 }); // 9% + 21%
  const b = rij("F2026-0002", factuurInhoud({ zakelijk: true, verlegd: true, regels: [regel("x", "Advies", 10, 8000, 21)] }));
  const c = rij("F2026-0003", factuurInhoud({ kor: true, regels: [regel("y", "Snoeien", 3, 4500, 0)] }));
  const orig = metNummer(factuurInhoud(), "F2026-0001");
  const credit = rij("C2026-0001", creditnotaUitFactuur({ nummer: "F2026-0001", inhoud: orig }, { betaaltermijnDagen: 14 }, [orig.secties[0].regels[1].id]));
  const alle = [a, b, c, credit];

  it("de CSV telt exact op tot de facturen (excl., btw, incl.)", () => {
    const rijen = lees(factuurCsv(alle));
    expect(rijen).toHaveLength(4);
    const som = (k: string) => rijen.reduce((s, r) => s + naarCenten(r[k]), 0);
    const verwacht = alle.map((r) => factuurTotalen(r.inhoud));
    expect(som("Totaal excl. btw")).toBe(verwacht.reduce((s, t) => s + t.totaalExcl, 0));
    expect(som("Totaal btw")).toBe(verwacht.reduce((s, t) => s + t.totaalBtw, 0));
    expect(som("Totaal incl. btw")).toBe(verwacht.reduce((s, t) => s + t.totaalIncl, 0));
    // per factuur: excl + btw = incl
    for (const r of rijen) expect(naarCenten(r["Totaal excl. btw"]) + naarCenten(r["Totaal btw"])).toBe(naarCenten(r["Totaal incl. btw"]));
  });

  it("btw per tarief, betaald en openstaand", () => {
    const [r1, r2, r3, r4] = lees(factuurCsv(alle));
    expect(naarCenten(r1["Grondslag 21%"])).toBe(130000);
    expect(naarCenten(r1["Btw 21%"])).toBe(27300);
    expect(naarCenten(r1["Grondslag 9%"])).toBe(12000);
    expect(naarCenten(r1["Btw 9%"])).toBe(1080);
    expect(naarCenten(r1.Betaald)).toBe(50000);
    expect(naarCenten(r1.Openstaand)).toBe(170380 - 50000);
    expect(r2["Btw verlegd"]).toBe("ja");
    expect(naarCenten(r2["Totaal btw"])).toBe(0);
    expect(naarCenten(r3["Totaal btw"])).toBe(0);
    expect(naarCenten(r4["Totaal incl. btw"])).toBe(-13080);
    expect(r4["Creditnota bij"]).toBe("F2026-0001");
    expect(naarCenten(r4.Openstaand)).toBe(0);
  });

  it("UBL: nummer, totalen en btw-categorie; creditnota als CreditNote met positieve bedragen", () => {
    const x = factuurUbl(a);
    expect(x).toContain("<cbc:ID>F2026-0001</cbc:ID>");
    expect(x).toContain('<cbc:PayableAmount currencyID="EUR">1703.80</cbc:PayableAmount>');
    expect(x).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
    expect(factuurUbl(b)).toContain("<cbc:ID>AE</cbc:ID>");
    const cx = factuurUbl(credit);
    expect(cx).toContain("<CreditNote");
    expect(cx).toContain('<cbc:PayableAmount currencyID="EUR">130.80</cbc:PayableAmount>');
    expect(cx).toContain("<cac:InvoiceDocumentReference><cbc:ID>F2026-0001</cbc:ID>");
  });
});
