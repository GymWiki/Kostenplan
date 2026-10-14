import { describe, expect, it } from "vitest";
import { bouwSnapshotInhoud, hashInhoud, maakSnapshot, zuiver, type EmbedToolRij } from "./bouw";

const nu = new Date("2026-10-13T10:00:00Z");

function tool(overrides: Record<string, unknown> = {}, branding: Record<string, unknown> = {}): EmbedToolRij {
  return {
    id: "tool1",
    status: "GEPUBLICEERD",
    deletedAt: null,
    resultaatConfig: { toelichting: "Let op", ctaTekst: "Vraag offerte" },
    leadFormConfig: { vraagTelefoon: false },
    activeCalculatorConfig: null,
    snapshotVersie: 0,
    company: {
      naam: "Groen BV",
      slug: "groen",
      subscriptionTier: "PLUS",
      overrideTier: null,
      standaardArbeidTariefUur: 50,
      standaardVoorrijTarief: 25,
      standaardBtwPercentage: 21,
      creator: { email: "eigenaar@geheim.nl" },
    },
    branding: {
      id: "b1",
      toolId: "tool1",
      createdAt: nu,
      updatedAt: nu,
      primaireKleur: "#15803d",
      toonTelefoonnummer: true,
      telefoonnummer: "0612345678",
      toonEmail: false,
      ...branding,
    },
    costSettings: {
      id: "c1",
      toolId: "tool1",
      createdAt: nu,
      updatedAt: nu,
      btwPercentage: 21,
      arbeidTariefUur: null,
      voorrijTarief: null,
      useAccountArbeidTarief: true,
      useAccountVoorrijTarief: true,
      useAccountBtwPercentage: true,
    },
    products: [
      {
        id: "p1",
        toolId: "tool1",
        naam: "Terras",
        createdAt: nu,
        materiaalCategorieen: [{ id: "m1", productId: "p1", materialen: [{ id: "o1", naam: "Tegel", prijs: 40, updatedAt: nu }] }],
        extraOpties: [],
      },
    ],
    ...overrides,
  } as unknown as EmbedToolRij;
}

describe("bouwSnapshotInhoud", () => {
  it("laat database-interne gegevens weg", () => {
    const tekst = JSON.stringify(bouwSnapshotInhoud(tool(), {}));
    expect(tekst).not.toContain("createdAt");
    expect(tekst).not.toContain("updatedAt");
    expect(tekst).not.toContain('"toolId":"tool1","createdAt');
    expect(tekst).not.toContain("eigenaar@geheim.nl");
    expect(tekst).not.toContain("companyId");
  });

  it("toont het inlog-e-mailadres alleen als de hovenier dat zelf aanzet", () => {
    expect(bouwSnapshotInhoud(tool(), {}).bedrijf.email).toBeNull();
    expect(bouwSnapshotInhoud(tool({}, { toonEmail: true }), {}).bedrijf.email).toBe("eigenaar@geheim.nl");
  });

  it("neemt telefoon alleen mee als die getoond mag worden", () => {
    expect(bouwSnapshotInhoud(tool(), {}).bedrijf.telefoon).toBe("0612345678");
    expect(bouwSnapshotInhoud(tool({}, { toonTelefoonnummer: false }), {}).bedrijf.telefoon).toBeNull();
  });

  it("markeert concept en verwijderde tools als niet beschikbaar", () => {
    expect(bouwSnapshotInhoud(tool(), {}).beschikbaar).toBe(true);
    expect(bouwSnapshotInhoud(tool({ status: "CONCEPT" }), {}).beschikbaar).toBe(false);
    expect(bouwSnapshotInhoud(tool({ deletedAt: nu }), {}).beschikbaar).toBe(false);
  });

  it("behoudt de rekengegevens van producten en materialen", () => {
    const inhoud = bouwSnapshotInhoud(tool(), {});
    expect(inhoud.producten[0].materiaalCategorieen[0].materialen[0]).toMatchObject({ naam: "Tegel", prijs: 40 });
    expect(inhoud.costSettings.btwPercentage).toBe(21);
  });
});

describe("hash en versie", () => {
  it("geeft dezelfde hash bij gelijke inhoud en een andere bij een prijswijziging", () => {
    const a = bouwSnapshotInhoud(tool(), {});
    expect(hashInhoud(a)).toBe(hashInhoud(bouwSnapshotInhoud(tool(), {})));
    const andere = tool();
    (andere.products[0].materiaalCategorieen[0].materialen[0] as { prijs: number }).prijs = 45;
    expect(hashInhoud(bouwSnapshotInhoud(andere, {}))).not.toBe(hashInhoud(a));
  });

  it("zet versie en datum erbij zonder de hash te veranderen", () => {
    const inhoud = bouwSnapshotInhoud(tool(), {});
    const een = maakSnapshot(inhoud, 1, nu);
    const twee = maakSnapshot(inhoud, 2, new Date("2027-01-01"));
    expect(een.inhoudHash).toBe(twee.inhoudHash);
    expect(twee.versie).toBe(2);
  });
});

describe("zuiver", () => {
  it("zet datums om in tekst en haalt interne sleutels weg", () => {
    expect(zuiver({ a: nu, createdAt: nu, toolId: "x", b: 1 })).toEqual({ a: nu.toISOString(), b: 1 });
  });
});

describe("weergave in de momentopname", () => {
  it("een bestaande rekentool (standaard) laat de momentopname en zijn hash precies zoals ze waren", () => {
    const zonder = bouwSnapshotInhoud(tool(), {});
    const leeg = bouwSnapshotInhoud(tool({ weergaveConfig: {} }), {});
    expect("weergave" in zonder).toBe(false);
    expect(hashInhoud(leeg)).toBe(hashInhoud(zonder));
  });

  it("een gekozen weergave en plaatsing zitten in de momentopname, zodat de embed ze ook zonder database kent", () => {
    const i = bouwSnapshotInhoud(tool({ weergaveConfig: { weergave: "tegels", plaatsing: "popup", knopTekst: "Bereken", onderdelen: { p1: { tegelTekst: "Terrassen", voorbeeldmaat: 12 } } } }), {});
    expect(i.weergave).toMatchObject({ weergave: "tegels", plaatsing: "popup", knopTekst: "Bereken", onderdelen: { p1: { tegelTekst: "Terrassen", voorbeeldmaat: 12 } } });
    expect(hashInhoud(i)).not.toBe(hashInhoud(bouwSnapshotInhoud(tool(), {})));
  });

  it("ongeldige instellingen vallen terug op de standaard", () => {
    expect("weergave" in bouwSnapshotInhoud(tool({ weergaveConfig: { weergave: "raar", plaatsing: 5 } }), {})).toBe(false);
  });
});
