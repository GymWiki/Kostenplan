import { describe, expect, it, vi } from "vitest";
import { berekenPrijs } from "./engine";
import { configVanProducten, invoerVanKlant } from "./adapters";
import { BASIS_KOSTEN, product } from "./test-helpers";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import { werkgebiedInstellingenSchema, type WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import { STANDAARD_MELDING_BUITEN } from "@/app/lib/werkgebied/teksten";
import type { PdokAdres } from "@/app/lib/werkgebied/pdok";

// De server vertrouwt de browser niet: adres en afstand worden opnieuw bepaald, en een aanvraag die volgens de
// instellingen niet mag wordt geweigerd (ook bij een rechtstreeks verzoek zonder rekentool).

vi.mock("server-only", () => ({}));
const laad = vi.hoisted(() => ({ tool: null as unknown }));
vi.mock("@/app/lib/dal", () => ({
  getToolForEmbed: async () => laad.tool,
  getMateriaalOptiesVoorEngineVelden: async () => ({}),
}));

const START = { postcode: "8011AB", huisnummer: "1", toevoeging: "", straat: "S", plaats: "Zwolle", lat: 52.5, lon: 6.1 };
const instellingen = (w: object = {}, m: object = {}): WerkgebiedInstellingen => werkgebiedInstellingenSchema.parse({ werkgebied: { start: START, ...w }, minimum: m });

const p = product({ id: "a", productiviteit: 10 });
function zetTool(i: WerkgebiedInstellingen | null) {
  laad.tool = {
    costSettings: { ...BASIS_KOSTEN, gebruiktAccountArbeidTarief: false, gebruiktAccountVoorrijTarief: false, gebruiktAccountBtw: false },
    company: { standaardArbeidTariefUur: 0, standaardVoorrijTarief: 0, standaardBtwPercentage: 0, werkgebied: i },
    werkgebied: null,
    activeCalculatorConfig: null,
    activeCalculatorConfigId: null,
    products: [p],
  };
}

// Een adres op ongeveer `km` kilometer ten noorden van het startadres.
const adresOp = (km: number): PdokAdres => ({ weergavenaam: "x", postcode: "9999ZZ", huisnummer: "5", straat: "Weg", plaats: "Ver", lat: START.lat + km / 111.195, lon: START.lon });

async function snapshotVan(i: WerkgebiedInstellingen | null, locatie: { postcode: string | null; afstandKm: number | null } | undefined, qty = 20) {
  const config = configVanProducten([p], BASIS_KOSTEN, { werkgebied: i });
  const invoer = invoerVanKlant({ producten: [p], hoeveelheden: { a: qty }, ...(locatie ? { locatie: { postcode: locatie.postcode, huisnummer: "5", toevoeging: "", afstandKm: locatie.afstandKm } } : {}) });
  return bouwLeadSnapshot({ config, invoer, resultaat: berekenPrijs(config, invoer) });
}

const storing = async () => ({ ok: false as const, reden: "storing" as const });
const gevonden = (km: number) => async () => ({ ok: true as const, waarde: adresOp(km) });
const bestaatNiet = async () => ({ ok: true as const, waarde: null });

describe("herberekenAanvraag met werkgebied", () => {
  const straal = (buiten: string) => instellingen({ aan: true, methode: "STRAAL", straalKm: 30, buiten });

  it("weigert een aanvraag buiten het werkgebied, ook als de browser een kleine afstand claimt", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 2 });
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(80) });
    expect(r.geweigerd).toBe(STANDAARD_MELDING_BUITEN);
  });

  it("neemt een aanvraag binnen het werkgebied aan en bewaart de afstand van de server", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 500 }); // browser liegt de andere kant op
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(10) });
    expect(r.geweigerd).toBeUndefined();
    expect(r.snapshot.locatie).toMatchObject({ gecontroleerd: true, binnenWerkgebied: true, plaats: "Ver" });
    expect(r.snapshot.locatie?.afstandKm).toBeCloseTo(10, 0);
  });

  it("weigert een interactieve aanvraag zonder invoer (geen omweg langs werkgebied en minimum); de reserve-opname blijft kunnen", async () => {
    const { herberekenAanvraag, MELDING_INVOER_ONTBREEKT } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 2 });
    const zonder = { ...sn, totaal: 1.21, rekenkern: undefined };
    expect((await herberekenAanvraag("t", zonder, { zoekAdres: gevonden(80) })).geweigerd).toBe(MELDING_INVOER_ONTBREEKT);
    expect((await herberekenAanvraag("t", zonder, { bron: "reserve", zoekAdres: gevonden(80) })).geweigerd).toBeUndefined();
  });

  it("weigert een aanvraag zonder postcode wanneer het werkgebied aan staat", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(null, undefined);
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(1) });
    expect(r.geweigerd).toMatch(/postcode en huisnummer/);
  });

  it("weigert een adres dat niet bestaat", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 1 });
    expect((await herberekenAanvraag("t", sn, { zoekAdres: bestaatNiet })).geweigerd).toMatch(/vinden dit adres niet/);
  });

  it("PDOK onbereikbaar: de aanvraag gaat door, gemarkeerd als niet gecontroleerd", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 500 });
    const r = await herberekenAanvraag("t", sn, { zoekAdres: storing });
    expect(r.geweigerd).toBeUndefined();
    expect(r.snapshot.locatie).toMatchObject({ gecontroleerd: false, binnenWerkgebied: "unknown", afstandKm: null });
    expect(r.snapshot.markeringen).toContain("WERKGEBIED_NIET_GECONTROLEERD");
  });

  it("toeslag: de server rekent de toeslag uit zijn eigen afstand", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = instellingen({ aan: true, methode: "STRAAL", straalKm: 20, buiten: "TOESLAG", toeslag: { modus: "PER_KM", perKmEuro: 1, zones: [] } });
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 0 });
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(34) });
    const regel = r.snapshot.rekenkern?.resultaat.regels.find((x) => x.id === "project:afstand");
    expect(regel?.omschrijving).toMatch(/Voorrijkosten extra afstand \(34/);
    expect(r.afwijking).toBeDefined();
  });

  it("buiten werkgebied bij 'markeren': toegestaan met markering", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("MARKEREN");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 1 });
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(90) });
    expect(r.geweigerd).toBeUndefined();
    expect(r.snapshot.markeringen).toEqual(["BUITEN_WERKGEBIED"]);
  });

  it("reserve: een aanvraag buiten het werkgebied wordt gemarkeerd, niet geweigerd", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = straal("GEEN_AANVRAAG");
    zetTool(i);
    const sn = await snapshotVan(i, { postcode: "9999ZZ", afstandKm: 1 });
    const r = await herberekenAanvraag("t", sn, { zoekAdres: gevonden(90), bron: "reserve" });
    expect(r.geweigerd).toBeUndefined();
    expect(r.snapshot.locatie?.binnenWerkgebied).toBe(false);
  });
});

describe("herberekenAanvraag met minimum", () => {
  it("weigert een aanvraag onder het minimum bij 'niet mogelijk' (de browser claimt een hoger bedrag)", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = instellingen({}, { aan: true, bedragEuro: 5000, gedrag: "GEEN_AANVRAAG" });
    zetTool(i);
    const sn = await snapshotVan(null, undefined, 1);
    sn.totaal = 9999;
    const r = await herberekenAanvraag("t", sn);
    expect(r.geweigerd).toMatch(/vanaf €\s5\.000/);
  });

  it("vult aan tot het minimum bij 'minimumtarief'", async () => {
    const { herberekenAanvraag } = await import("./server");
    const i = instellingen({}, { aan: true, bedragEuro: 5000, gedrag: "TARIEF" });
    zetTool(i);
    const sn = await snapshotVan(null, undefined, 1);
    const r = await herberekenAanvraag("t", sn);
    expect(r.geweigerd).toBeUndefined();
    expect(Math.round(r.snapshot.totaal * 100)).toBe(500000);
  });

  it("alles uit: geen weigering en geen locatie in de aanvraag", async () => {
    const { herberekenAanvraag } = await import("./server");
    zetTool(null);
    const sn = await snapshotVan(null, undefined);
    const r = await herberekenAanvraag("t", sn);
    expect(r.geweigerd).toBeUndefined();
    expect(r.snapshot.locatie).toBeUndefined();
    expect(r.snapshot.markeringen).toBeUndefined();
    expect(r.afwijking).toBeUndefined();
  });
});
