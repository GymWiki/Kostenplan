import { describe, expect, it } from "vitest";
import { controleerOfferte } from "./controle";
import { voorbeeldKor, voorbeeldParticulier } from "./voorbeelden";
import type { OfferteInhoud } from "./model";

const kopie = (i: OfferteInhoud): OfferteInhoud => JSON.parse(JSON.stringify(i));
const NU = new Date("2026-10-20T10:00:00");

describe("controleerOfferte", () => {
  it("een complete offerte heeft niets blokkerends", () => {
    expect(controleerOfferte(voorbeeldParticulier(), NU).blokkerend).toEqual([]);
  });
  it("blokkeert zonder KvK-nummer", () => {
    const i = kopie(voorbeeldParticulier());
    i.afzender.kvkNummer = "";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).toContain("bedrijf");
    i.afzender.kvkNummer = "123";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).toContain("bedrijf");
  });
  it("blokkeert bv zonder statutaire zetel", () => {
    const i = kopie(voorbeeldParticulier());
    i.afzender.rechtsvorm = "BV";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).toContain("bedrijf");
    i.afzender.statutaireZetel = "Utrecht";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).not.toContain("bedrijf");
  });
  it("blokkeert met een €0-bedragregel, maar niet met een tekstregel", () => {
    const i = kopie(voorbeeldParticulier());
    i.secties[0].regels[0].prijsCenten = 0;
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).toContain("nulregels");
    i.secties[0].regels[0].type = "tekst";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).not.toContain("nulregels");
  });
  it("blokkeert zonder bedragregels, zonder klant-e-mail en met een verlopen datum", () => {
    const i = kopie(voorbeeldParticulier());
    i.secties = [];
    i.klant.email = "";
    i.geldigTot = "2026-10-01";
    const ids = controleerOfferte(i, NU).blokkerend.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["geenregels", "klant", "geldig"]));
  });
  it("KOR: geen btw-id nodig; zonder KOR wel", () => {
    expect(controleerOfferte(voorbeeldKor(), NU).blokkerend.map((p) => p.id)).not.toContain("btwid");
    const i = kopie(voorbeeldParticulier());
    i.afzender.btwId = "";
    expect(controleerOfferte(i, NU).blokkerend.map((p) => p.id)).toContain("btwid");
  });
  it("waarschuwt zonder algemene voorwaarden en bij >25% afwijking van de rekentool", () => {
    const i = kopie(voorbeeldParticulier());
    i.bijlagen = [];
    i.bron = { leadId: "x", totaalRekentoolInclCenten: 100_000 };
    const w = controleerOfferte(i, NU).waarschuwingen.map((p) => p.id);
    expect(w).toEqual(expect.arrayContaining(["av", "afwijking"]));
    expect(controleerOfferte(i, NU).blokkerend).toEqual([]);
  });
});
