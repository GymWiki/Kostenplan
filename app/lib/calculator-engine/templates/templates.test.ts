import { describe, expect, it } from "vitest";
import { heeftBlokkerendeFouten, valideerCalculatorConfig } from "../validate";
import { evaluatePriceRules, bouwScope, pasAfgeleideVariabelenToe, bouwResultaat } from "../index";
import { CALCULATOR_TEMPLATES, TEMPLATE_CATEGORIEEN } from "./index";

describe("CALCULATOR_TEMPLATES (Deel 25-27)", () => {
  it("bevat precies de vijf verplichte eerste templates", () => {
    expect(CALCULATOR_TEMPLATES.map((t) => t.id).sort()).toEqual(
      ["bestrating", "kozijnen", "schilderwerk", "schutting", "tuinaanleg"].sort()
    );
  });

  it("elke template heeft een unieke id", () => {
    const ids = CALCULATOR_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CALCULATOR_TEMPLATES)("$naam: bouwConfig() geeft een geldige, publiceerbare configuratie", (template) => {
    const config = template.bouwConfig();
    const meldingen = valideerCalculatorConfig(config);
    expect(heeftBlokkerendeFouten(meldingen)).toBe(false);
    expect(config.velden.length).toBeGreaterThan(0);
    expect(config.regels.length).toBeGreaterThan(0);
  });

  it.each(CALCULATOR_TEMPLATES)("$naam: elk PRODUCT_KEUZE-veld heeft een bijbehorende materiaalKeuzes-ingang", (template) => {
    const config = template.bouwConfig();
    const productKeuzeVelden = config.velden.filter((v) => v.soort === "PRODUCT_KEUZE");
    for (const veld of productKeuzeVelden) {
      const keuze = template.materiaalKeuzes.find((k) => k.veldId === veld.id);
      expect(keuze, `Veld "${veld.id}" mist een materiaalKeuzes-ingang`).toBeDefined();
      expect(keuze!.opties.length).toBeGreaterThan(0);
    }
  });

  it.each(CALCULATOR_TEMPLATES)("$naam: rekent een realistische prijsindicatie uit voor demo-invoer", (template) => {
    const config = template.bouwConfig();

    // Demo-invoer: standaardwaarden waar aanwezig, anders een redelijk getal
    // per veldsoort — en voor elk PRODUCT_KEUZE-veld de eerste optie uit
    // materiaalKeuzes (dezelfde volgorde als waarin de echte tool-aanmaak
    // ze straks aanmaakt, zie Fase 15).
    const waarden: Record<string, unknown> = {};
    const materiaalPrijzen: Record<string, number> = {};
    for (const veld of config.velden) {
      switch (veld.soort) {
        case "NUMMER":
        case "AANTAL":
        case "OPPERVLAKTE":
        case "SLIDER":
          waarden[veld.id] = veld.standaardWaarde ?? 10;
          break;
        case "JA_NEE":
        case "CHECKBOX":
          waarden[veld.id] = true;
          break;
        case "DROPDOWN":
        case "RADIO":
          waarden[veld.id] = veld.standaardWaarde ?? veld.opties[0]?.waarde;
          break;
        case "AFMETINGEN":
          waarden[veld.id] = { lengte: 6, breedte: 4, hoogte: veld.metHoogte ? 2 : undefined };
          break;
        case "PRODUCT_KEUZE": {
          const keuze = template.materiaalKeuzes.find((k) => k.veldId === veld.id)!;
          const optieId = `demo-${veld.id}-0`;
          waarden[veld.id] = optieId;
          materiaalPrijzen[optieId] = keuze.opties[0].prijs;
          break;
        }
        case "TEKST":
          waarden[veld.id] = "demo";
          break;
      }
    }

    const basisScope = bouwScope(config.velden, waarden, materiaalPrijzen);
    const scope = pasAfgeleideVariabelenToe(basisScope, config.afgeleideVariabelen);
    const evaluatie = evaluatePriceRules(config.regels, scope, { alleenPubliek: true });
    const resultaat = bouwResultaat(evaluatie, {
      btwPercentage: 21,
      resultaatInstellingen: config.resultaatInstellingen,
      heeftGeldigeInvoer: true,
    });

    expect(resultaat.totaal).toBeGreaterThan(0);
    expect(Number.isFinite(resultaat.totaal)).toBe(true);
  });
});

describe("TEMPLATE_CATEGORIEEN", () => {
  it("is afgeleid uit de templates zelf, geen losse lijst", () => {
    for (const template of CALCULATOR_TEMPLATES) {
      expect(TEMPLATE_CATEGORIEEN).toContain(template.categorie);
    }
  });
});
