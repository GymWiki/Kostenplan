import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RekentoolSnapshot } from "@/app/lib/snapshot/types";
import { parseEmbedParams } from "@/app/lib/weergave/embed-opties";

// De momentopname (embed-fallback, zonder database) bevat alles om de rekentool te tonen, ook de weergave.
vi.mock("@/app/lib/actions/analytics", () => ({ recordPublicAnalyticsEventAction: vi.fn() }));
vi.mock("@/app/lib/actions/leads", () => ({ createLeadAction: vi.fn() }));
vi.mock("@/app/lib/fonts", () => ({ fontFamilyFor: () => "sans-serif", brandingFontVariables: () => "" }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

const { SnapshotWeergave } = await import("./snapshot-weergave");

const product = (id: string, naam: string, prijs: number) => ({
  id,
  naam,
  omschrijving: null,
  icoon: null,
  actief: true,
  order: 0,
  eenheid: "m2",
  sjabloon: "ENKELE_HOEVEELHEID",
  sjabloonConfig: {},
  productiviteit: 10,
  arbeidTariefOverride: null,
  transportkostenOverride: null,
  transportMeeschalend: false,
  voorrijkostenOverride: null,
  voorrijMeeschalend: false,
  materiaalCategorieen: [{ id: `${id}c`, naam: "Materiaal", verplicht: false, materialen: [{ id: `${id}m`, naam: "Standaard", prijs, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null, foto: null, actief: true }] }],
  extraOpties: [],
});

const kosten = { arbeidEnabled: true, arbeidStapEenheid: "DAGDEEL", arbeidTariefUur: 50, arbeidTariefDagdeel: 200, arbeidTariefDag: 380, arbeidAfronden: false, transportEnabled: true, transportTarief: 0, voorrijEnabled: true, voorrijTarief: 35, materiaalEnabled: true, btwPercentage: 21, bandbreedteModus: "GEEN", bandbreedteMargeOmlaag: 10, bandbreedteMargeOmhoog: 10, arbeidZichtbaar: true, materiaalZichtbaar: true, transportZichtbaar: true, voorrijZichtbaar: true };

const snapshot = (extra: Partial<RekentoolSnapshot> = {}) =>
  ({
    schemaVersie: 1,
    versie: 1,
    gepubliceerdOp: "2026-10-14T00:00:00Z",
    inhoudHash: "h",
    toolId: "t1",
    beschikbaar: true,
    bedrijf: { naam: "Groen BV", telefoon: null, email: null },
    tier: "PRO",
    soort: "klassiek",
    branding: null,
    costSettings: kosten,
    producten: [product("a", "Terras", 40), product("b", "Schutting", 85), product("c", "Gazon", 12)],
    toelichting: null,
    ctaTekst: null,
    vraagTelefoon: true,
    engine: null,
    ...extra,
  }) as unknown as RekentoolSnapshot;

const html = (s: RekentoolSnapshot, opties?: Parameters<typeof SnapshotWeergave>[0]["opties"]) => renderToStaticMarkup(<SnapshotWeergave snapshot={s} opties={opties} />);

describe("SnapshotWeergave (momentopname zonder database)", () => {
  it("zonder weergave in de momentopname: alles op één pagina, zoals altijd", () => {
    const h = html(snapshot());
    expect(h).toContain("Geef bij de onderdelen de gewenste hoeveelheid op");
    expect(h).not.toContain("Waar kunnen we je mee helpen?");
  });

  it("met tegels: een tegel per onderdeel met een vanaf-prijs uit de rekenkern", () => {
    const h = html(snapshot({ weergave: { weergave: "tegels", plaatsing: "inline", knopTekst: "x", knopPositie: "rechtsonder", kop: "Waar kunnen we je mee helpen?", toevoegTekst: "Toevoegen aan mijn tuinplan", prijsNaContact: false, vanafInclVoorrij: false, onderdelen: { b: { tegelTekst: "Alle schuttingen", voorbeeldmaat: null } } } }));
    expect(h).toContain("Waar kunnen we je mee helpen?");
    expect(h).toContain("Terras");
    expect(h).toContain("Alle schuttingen");
    expect(h).toMatch(/vanaf\s*€/);
    expect(h).toContain("Vanaf-prijzen zijn inclusief btw en exclusief voorrijkosten");
  });

  it("de embed-code kan de weergave en de selectie onderdelen per plek overschrijven", () => {
    const params = parseEmbedParams({ weergave: "stappen", onderdelen: "b" });
    const h = html(snapshot(), params);
    // één onderdeel: direct de configurator (geen raster, geen kiesstap)
    expect(h).toContain("Schutting");
    expect(h).not.toContain("Terras");
    expect(h).not.toContain("Waar kunnen we je mee helpen?");
    expect(h).not.toContain("progressbar");
  });
});
