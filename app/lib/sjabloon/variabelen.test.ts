import { describe, expect, it } from "vitest";
import { STANDAARD_DEELTEKST, STANDAARD_HERINNERINGSTEKST, bouwDeelBericht } from "@/app/lib/offerte/berichten";
import { STANDAARD_AANMANING, STANDAARD_CREDITTEKST, STANDAARD_FACTUURTEKST, STANDAARD_HERINNERING, STANDAARD_LAATSTE_HERINNERING, bouwFactuurBericht } from "@/app/lib/factuur/berichten";
import { STANDAARD_AFWIJZING_ONDERWERP, STANDAARD_AFWIJZING_TEKST, bouwAfwijzing } from "@/app/lib/werkgebied/afwijzingsmail";
import { VOORWAARDEN_INFO, voorwaardenTeksten } from "@/app/lib/offerte/gegevens";
import { voorbeeldZakelijk } from "@/app/lib/offerte/voorbeelden";
import { factuurInhoud } from "@/app/lib/factuur/test-helpers";
import { onbekendeTokens, tokensIn } from "./render";
import { GROEPEN, VARIABELEN, groepenVoor, variabelenVoor, voorbeeldWaarden, type SjabloonContext } from "./variabelen";

// De definitielijst is de ene bron: een tekst met een {variabele} die hier niet in staat (of niet beschikbaar is voor dat soort tekst)
// laat deze test falen. Voeg een nieuwe variabele dus eerst toe aan VARIABELEN.
const STANDAARDTEKSTEN: { naam: string; context: SjabloonContext; tekst: string }[] = [
  { naam: "STANDAARD_DEELTEKST", context: "offerte", tekst: STANDAARD_DEELTEKST },
  { naam: "STANDAARD_HERINNERINGSTEKST", context: "offerte", tekst: STANDAARD_HERINNERINGSTEKST },
  { naam: "STANDAARD_FACTUURTEKST", context: "factuur", tekst: STANDAARD_FACTUURTEKST },
  { naam: "STANDAARD_CREDITTEKST", context: "factuur", tekst: STANDAARD_CREDITTEKST },
  { naam: "STANDAARD_HERINNERING", context: "factuur", tekst: STANDAARD_HERINNERING },
  { naam: "STANDAARD_AANMANING", context: "factuur", tekst: STANDAARD_AANMANING },
  { naam: "STANDAARD_LAATSTE_HERINNERING", context: "factuur", tekst: STANDAARD_LAATSTE_HERINNERING },
  { naam: "STANDAARD_AFWIJZING_ONDERWERP", context: "afwijzing", tekst: STANDAARD_AFWIJZING_ONDERWERP },
  { naam: "STANDAARD_AFWIJZING_TEKST", context: "afwijzing", tekst: STANDAARD_AFWIJZING_TEKST },
  ...Object.entries(VOORWAARDEN_INFO).flatMap(([id, i]) => [...(i.tekst ? [i.tekst] : []), ...(i.keuzes ?? []).map((k) => k.tekst)].map((tekst) => ({ naam: `voorwaarde ${id}`, context: "voorwaarden" as const, tekst }))),
];

describe("definitielijst", () => {
  it("elke sleutel komt maar één keer voor en heeft label, voorbeeld, groep en context", () => {
    const sleutels = VARIABELEN.map((v) => v.key);
    expect(new Set(sleutels).size).toBe(sleutels.length);
    for (const v of VARIABELEN) {
      expect(v.key, v.key).toMatch(/^\w+$/);
      expect(v.label.trim(), v.key).not.toBe("");
      expect(v.voorbeeld.trim(), v.key).not.toBe("");
      expect(GROEPEN[v.groep], v.key).toBeDefined();
      expect(v.contexten.length, v.key).toBeGreaterThan(0);
    }
  });

  for (const t of STANDAARDTEKSTEN) {
    it(`alle {variabelen} in ${t.naam} staan in de lijst en zijn beschikbaar voor ${t.context}`, () => {
      expect(onbekendeTokens(t.tekst, t.context), t.naam).toEqual([]);
      expect(tokensIn(t.tekst).length).toBeGreaterThanOrEqual(0);
    });
  }

  it("de verouderde namen (aliassen) wijzen naar een bestaande variabele", () => {
    for (const v of VARIABELEN.filter((x) => x.alias)) expect(VARIABELEN.some((x) => x.key === v.alias), v.key).toBe(true);
  });

  it("de editor groepeert alleen wat er is en geeft elke groep één kleurfamilie", () => {
    for (const c of ["offerte", "factuur", "afwijzing"] as const) {
      const groepen = groepenVoor(c);
      expect(groepen.flatMap((g) => g.variabelen).map((v) => v.key).sort()).toEqual(variabelenVoor(c).map((v) => v.key).sort());
      expect(new Set(groepen.map((g) => g.kleur)).size).toBe(groepen.length);
    }
  });
});

describe("elke variabele wordt ingevuld op elke plek waar hij beschikbaar is", () => {
  const LINK = "https://kostenplan.nl/o/abc123";

  it("offerte: deelbericht en herinnering", () => {
    const inhoud = voorbeeldZakelijk();
    for (const v of variabelenVoor("offerte")) {
      for (const herinnering of [false, true]) {
        const { tekst } = bouwDeelBericht({ inhoud, link: LINK, sjabloon: `[{${v.key}}]`, herinnering });
        const eerste = tekst.split("\n")[0]!;
        expect(eerste, `${v.key} (herinnering ${herinnering})`).not.toBe("[]");
        expect(eerste).not.toMatch(/undefined|null|\{|NaN/);
      }
    }
  });

  it("factuur: alle soorten berichten", () => {
    const inhoud = factuurInhoud({});
    for (const v of variabelenVoor("factuur")) {
      const { tekst } = bouwFactuurBericht({ inhoud, totaalInclCenten: 123450, link: LINK, soort: "factuur", sjabloon: `[{${v.key}}]` });
      expect(tekst, v.key).not.toBe("[]");
      expect(tekst).not.toMatch(/undefined|null|\{|NaN/);
    }
    // De standaardteksten van alle soorten vullen alles in.
    for (const soort of ["factuur", "creditnota", "herinnering", "aanmaning", "laatste-herinnering"] as const) {
      const { tekst } = bouwFactuurBericht({ inhoud, totaalInclCenten: 123450, link: LINK, soort });
      expect(tekst, soort).not.toMatch(/\{\w+\}|undefined|null/);
    }
  });

  it("afwijzingsmail", () => {
    const m = bouwAfwijzing({ onderwerp: "", tekst: "" }, "Jan", "De Boer");
    expect(m.onderwerp).toBe("Je aanvraag bij De Boer");
    expect(m.tekst).toContain("Beste Jan,");
    expect(m.tekst).not.toMatch(/\{\w+\}/);
    expect(bouwAfwijzing({ onderwerp: "{bedrijf}", tekst: "{naam}" }, "A & B", "<b>X</b>")).toEqual({ onderwerp: "<b>X</b>", tekst: "A & B" });
  });

  it("voorwaarden", () => {
    const t = voorwaardenTeksten([{ id: "aanslag", aan: true, termijnMaanden: 18 }]);
    expect(t[0]).toContain("18 maanden");
  });

  it("de voorbeeldwaarden van een context vullen elke aanduiding in de standaardtekst", () => {
    for (const t of STANDAARDTEKSTEN.filter((x) => x.context !== "voorwaarden")) {
      const w = voorbeeldWaarden(t.context);
      for (const k of tokensIn(t.tekst)) expect(w[k], `${t.naam}: ${k}`).toBeTruthy();
    }
  });
});
