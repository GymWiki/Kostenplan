import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { berekenPrijs } from "./engine";
import { configVanProducten } from "./adapters";
import { invoerVoor, scenario } from "./test-scenarios";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import { bouwOfferteUitLead } from "@/app/lib/offerte/uit-lead";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import { breakdownRangeVan } from "./weergave";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteInhoud } from "@/app/lib/offerte/model";

// De klant, de hovenier (editor), de opgeslagen aanvraag, de server en de offerte zien voor dezelfde invoer
// exact hetzelfde totaal.

vi.mock("server-only", () => ({}));
const laadConfig = vi.hoisted(() => ({ config: null as unknown }));
vi.mock("@/app/lib/dal", () => ({
  getToolForEmbed: async () => laadConfig.config,
  getMateriaalOptiesVoorEngineVelden: async () => ({}),
}));

describe("klant = editor = aanvraag = server = offerte", () => {
  it("geeft voor willekeurige rekentools en invoer overal hetzelfde totaal", async () => {
    const { herberekenAanvraag } = await import("./server");
    await fc.assert(
      fc.asyncProperty(scenario, async ([producten, kosten0, q, vast]) => {
        const kosten = { ...kosten0, bandbreedteModus: "GEEN" as const };
        const config = configVanProducten(producten, kosten, { vasteKosten: vast });
        const invoer = invoerVoor(producten, [q[0] + 1, q[1] + 1]);

        // 1. klant-rekentool
        const klant = berekenPrijs(config, invoer);
        if (!klant.heeftSelectie) return;
        const klantCenten = klant.totaalInclCenten;
        expect(Math.round((breakdownRangeVan(klant).totaal as number) * 100)).toBe(klantCenten);

        // 2. de opgeslagen aanvraag (momentopname) en de oude velden daarin
        const snapshot = bouwLeadSnapshot({ config, invoer, resultaat: klant });
        expect(snapshot.rekenkern?.resultaat.totaalInclCenten).toBe(klantCenten);
        expect(Math.round(snapshot.totaal * 100)).toBe(klantCenten);

        // 3. de server rekent opnieuw, ook als de browser een ander bedrag claimt
        laadConfig.config = {
          costSettings: { ...kosten, gebruiktAccountArbeidTarief: false, gebruiktAccountVoorrijTarief: false, gebruiktAccountBtw: false },
          company: { standaardArbeidTariefUur: 0, standaardVoorrijTarief: 0, standaardBtwPercentage: 0 },
          activeCalculatorConfig: null,
          activeCalculatorConfigId: null,
          products: producten.map((p) => ({ ...p, prijs: undefined })),
        };
        // (De server bouwt zijn configuratie met de standaard "vaste kosten per onderdeel", net als de browser van elke bestaande rekentool.)
        let server = { snapshot };
        if (vast === "PER_ONDERDEEL") {
          const verknoeid = JSON.parse(JSON.stringify(snapshot)) as LeadSnapshot;
          verknoeid.totaal = 1;
          verknoeid.rekenkern!.resultaat.totaalInclCenten = 100;
          const gerekend = await herberekenAanvraag("t", verknoeid);
          expect(gerekend.nagerekend).toBe(true);
          expect(Math.round(gerekend.snapshot.totaal * 100)).toBe(klantCenten);
          expect(gerekend.snapshot.rekenkern?.bron).toBe("server");
          expect(gerekend.afwijking).toEqual({ klantCenten: 100, serverCenten: klantCenten });
          server = gerekend;
        }

        // 4. de offerte, voor een particulier (bedragen incl. btw) en een zakelijke klant (excl. btw)
        const bouw = bouwOfferteUitLead(server.snapshot);
        for (const type of ["particulier", "zakelijk"] as const) {
          const inhoud = { secties: bouw.secties, klant: { type }, afzender: { korActief: false }, rekenregel: 2 } as Pick<OfferteInhoud, "secties" | "klant" | "afzender" | "rekenregel">;
          expect(berekenTotalen(inhoud).totaalIncl).toBe(klantCenten);
        }
        expect(bouw.totaalRekentoolInclCenten).toBe(klantCenten);

        // 5. de kostenopbouw in de editor voor één onderdeel: hetzelfde bedrag als dat onderdeel in het totaal
        const o = klant.onderdelen[0];
        const p = producten.find((x) => x.id === o.id)!;
        if (p.sjabloon === "ENKELE_HOEVEELHEID") {
          const opbouw = berekenKostenOpbouw({
            product: { ...p, sjabloon: "ENKELE_HOEVEELHEID" } as never,
            optieId: null,
            hoeveelheid: o.hoeveelheid,
            costSettings: kosten,
          });
          const alleen = berekenPrijs(configVanProducten([p], kosten, { vasteKosten: "PER_ONDERDEEL" }), invoerVoor([p], [o.hoeveelheid]));
          expect(Math.round(opbouw.totaal * 100)).toBe(alleen.subtotaalExclCenten);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("de offerte houdt ook bij een prijs met een deel van een cent per eenheid exact hetzelfde totaal", async () => {
    const { product, optie } = await import("./test-helpers");
    const p = product({ id: "a", productiviteit: 7, materiaalCategorieen: [{ id: "c", naam: "M", materialen: [optie("m", "Zoden", 12.345)] }] });
    const config = configVanProducten([p], { ...(await import("./test-helpers")).BASIS_KOSTEN });
    const invoer = invoerVoor([p], [7.3, 0]);
    const r = berekenPrijs(config, invoer);
    const bouw = bouwOfferteUitLead(bouwLeadSnapshot({ config, invoer, resultaat: r }));
    const inhoud = { secties: bouw.secties, klant: { type: "particulier" }, afzender: { korActief: false }, rekenregel: 2 } as Pick<OfferteInhoud, "secties" | "klant" | "afzender" | "rekenregel">;
    expect(berekenTotalen(inhoud).totaalIncl).toBe(r.totaalInclCenten);
  });
});
