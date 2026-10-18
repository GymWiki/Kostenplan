import { describe, expect, it } from "vitest";
import {
  STANDAARD_UREN,
  convertTarief,
  convertWerktempo,
  effectieveEenheid,
  formatWerktempo,
  planGlobaleWissel,
  planProductWissel,
  planUrenWissel,
  urenPerEenheid,
  uurtarief,
  valideerUrenConfig,
  type PlanProduct,
  type UrenConfig,
  type WerktempoEenheid,
} from "./werktempo";
import { product, reken } from "./pricing/test-helpers";

const EENHEDEN: WerktempoEenheid[] = ["UUR", "DAGDEEL", "DAG"];
const AANGEPAST: UrenConfig = { urenPerDagdeel: 3.5, urenPerDag: 7.5 };
const CONFIGS: [string, UrenConfig][] = [["standaard (4 en 8 uur)", STANDAARD_UREN], ["aangepast (3,5 en 7,5 uur)", AANGEPAST]];

describe("convertWerktempo", () => {
  it("rekent om met de standaarddefinities: uur→dag ×8, uur→dagdeel ×4, dagdeel→dag ×2, dag→uur ÷8", () => {
    expect(convertWerktempo(12, "UUR", "DAG")).toBe(96);
    expect(convertWerktempo(12, "UUR", "DAGDEEL")).toBe(48);
    expect(convertWerktempo(12, "DAGDEEL", "DAG")).toBe(24);
    expect(convertWerktempo(96, "DAG", "UUR")).toBe(12);
    expect(convertWerktempo(48, "DAGDEEL", "UUR")).toBe(12);
    expect(convertWerktempo(24, "DAG", "DAGDEEL")).toBe(12);
  });

  it("gebruikt de aangepaste definities", () => {
    expect(convertWerktempo(10, "UUR", "DAGDEEL", AANGEPAST)).toBe(35);
    expect(convertWerktempo(10, "UUR", "DAG", AANGEPAST)).toBe(75);
    expect(convertWerktempo(35, "DAGDEEL", "DAG", AANGEPAST)).toBeCloseTo(75, 9);
  });

  it("dezelfde eenheid verandert niets", () => {
    for (const e of EENHEDEN) expect(convertWerktempo(7.3, e, e, AANGEPAST)).toBe(7.3);
  });

  for (const [naam, c] of CONFIGS) {
    it(`heen-en-weer wisselen geeft exact dezelfde waarde, alle 6 richtingen, ${naam}`, () => {
      for (const waarde of [0.5, 1, 7.5, 12, 33.33, 0.07, 123456.78, 3.5]) {
        for (const van of EENHEDEN) {
          for (const naar of EENHEDEN) {
            if (van === naar) continue;
            const terug = convertWerktempo(convertWerktempo(waarde, van, naar, c), naar, van, c);
            expect(terug).toBe(waarde);
          }
        }
      }
    });
  }

  it("rondt intern niet af op 2 decimalen (de UI doet dat)", () => {
    expect(convertWerktempo(10, "DAGDEEL", "DAG", AANGEPAST)).toBeCloseTo(21.428571428571, 9);
    expect(formatWerktempo(21.428571428571)).toBe("21,43");
    expect(formatWerktempo(12)).toBe("12");
  });
});

describe("tarief en uurtarief", () => {
  it("€ 320 per dag bij 8 uur is € 40 per uur", () => {
    expect(uurtarief(320, "DAG")).toBe(40);
    expect(uurtarief(160, "DAGDEEL")).toBe(40);
    expect(uurtarief(40, "UUR")).toBe(40);
    expect(uurtarief(300, "DAG", AANGEPAST)).toBe(40);
    expect(convertTarief(40, "UUR", "DAG", AANGEPAST)).toBe(300);
  });
});

describe("effectieve eenheid", () => {
  it("product.eenheid ?? instelling", () => {
    expect(effectieveEenheid(null, "DAG")).toBe("DAG");
    expect(effectieveEenheid(undefined, "UUR")).toBe("UUR");
    expect(effectieveEenheid("DAGDEEL", "DAG")).toBe("DAGDEEL");
  });
});

describe("valideerUrenConfig", () => {
  it("accepteert de standaard en decimalen", () => {
    expect(valideerUrenConfig(STANDAARD_UREN).ok).toBe(true);
    expect(valideerUrenConfig(AANGEPAST).ok).toBe(true);
    expect(valideerUrenConfig({ urenPerDagdeel: 24, urenPerDag: 24 }).ok).toBe(true);
  });
  it("weigert 0, negatief, te groot, niet-getal en dagdeel > dag", () => {
    const fout = (c: UrenConfig) => {
      const r = valideerUrenConfig(c);
      return r.ok ? null : r.fouten;
    };
    expect(fout({ urenPerDagdeel: 0, urenPerDag: 8 })?.urenPerDagdeel).toMatch(/meer dan 0/);
    expect(fout({ urenPerDagdeel: 4, urenPerDag: -1 })?.urenPerDag).toMatch(/meer dan 0/);
    expect(fout({ urenPerDagdeel: 4, urenPerDag: 25 })?.urenPerDag).toMatch(/24/);
    expect(fout({ urenPerDagdeel: NaN, urenPerDag: 8 })?.urenPerDagdeel).toMatch(/Vul in/);
    expect(fout({ urenPerDagdeel: 9, urenPerDag: 8 })?.urenPerDagdeel).toMatch(/niet langer zijn dan een dag/);
  });
});

// ---- De kernregel: dezelfde prijs, ongeacht in welke eenheid het werktempo staat. -----------------------------------------

const kosten = (g: WerktempoEenheid, c: UrenConfig, tarief: number) => ({
  arbeidStapEenheid: g,
  arbeidTariefUur: g === "UUR" ? tarief : 0,
  arbeidTariefDagdeel: g === "DAGDEEL" ? tarief : 0,
  arbeidTariefDag: g === "DAG" ? tarief : 0,
  urenPerDagdeel: c.urenPerDagdeel,
  urenPerDag: c.urenPerDag,
  voorrijTarief: 0,
});
const prijs = (werktempo: number, eenheid: WerktempoEenheid | null, g: WerktempoEenheid, c: UrenConfig, tarief: number, hoeveelheid = 37) =>
  reken([product({ id: "p", productiviteit: werktempo, werktempoEenheid: eenheid })], { hoeveelheden: { p: hoeveelheid } }, kosten(g, c, tarief)).totaalInclCenten;

describe("de prijs hangt niet af van de eenheid van het werktempo", () => {
  for (const [naam, c] of CONFIGS) {
    for (const g of EENHEDEN) {
      it(`elk product-eenheid-paar geeft dezelfde prijs; rekentool in ${g.toLowerCase()}, ${naam}`, () => {
        const tarief = { UUR: 47.5, DAGDEEL: 47.5 * c.urenPerDagdeel, DAG: 47.5 * c.urenPerDag }[g];
        const basis = prijs(12, null, g, c, tarief);
        expect(basis).toBeGreaterThan(0);
        for (const van of EENHEDEN) {
          // Het werktempo 12 staat in `g` (volgt de rekentool); omgerekend naar elke eigen eenheid moet de prijs gelijk blijven.
          for (const naar of EENHEDEN) {
            const w = convertWerktempo(12, g, naar, c);
            expect(prijs(w, naar, g, c, tarief)).toBe(basis);
            // Heen-en-weer: via `van` terug naar `naar` geeft dezelfde prijs.
            const via = convertWerktempo(convertWerktempo(w, naar, van, c), van, naar, c);
            expect(prijs(via, naar, g, c, tarief)).toBe(basis);
          }
        }
      });
    }
  }

  it("twee producten met dezelfde inhoud maar een andere eenheid geven hetzelfde totaal", () => {
    const p1 = product({ id: "a", productiviteit: 6, werktempoEenheid: null });
    const p2 = product({ id: "b", productiviteit: 12, werktempoEenheid: "DAG" });
    const r = reken([p1, p2], { hoeveelheden: { a: 10, b: 10 } }, kosten("DAGDEEL", STANDAARD_UREN, 180));
    const [x, y] = r.onderdelen;
    expect(x!.kosten.arbeid).toBe(y!.kosten.arbeid);
    expect(x!.subtotaalExclCenten).toBe(y!.subtotaalExclCenten);
  });

  it("bestaande producten (zonder eigen eenheid) rekenen exact als voorheen: hoeveelheid / werktempo × tarief", () => {
    const r = reken([product({ id: "p", productiviteit: 5 })], { hoeveelheden: { p: 20 } }, kosten("DAGDEEL", STANDAARD_UREN, 200));
    expect(r.onderdelen[0]!.kosten.arbeid).toBe(20 / 5 * 200 * 100);
    expect(r.onderdelen[0]!.arbeidstijd).toBe(4);
  });

  it("afronden gebeurt in de eenheid van de rekentool, dus de prijs verschilt niet per eenheid van het product", () => {
    const g = "DAGDEEL";
    const k = { ...kosten(g, STANDAARD_UREN, 200), arbeidAfronden: true };
    const a = reken([product({ id: "p", productiviteit: 5, werktempoEenheid: null })], { hoeveelheden: { p: 22 } }, k).totaalInclCenten;
    const b = reken([product({ id: "p", productiviteit: 10, werktempoEenheid: "DAG" })], { hoeveelheden: { p: 22 } }, k).totaalInclCenten;
    const c = reken([product({ id: "p", productiviteit: 1.25, werktempoEenheid: "UUR" })], { hoeveelheden: { p: 22 } }, k).totaalInclCenten;
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("uren-definities wijzigen verandert de prijs niet voor producten in de eenheid van de rekentool", () => {
    const a = prijs(12, null, "DAG", STANDAARD_UREN, 320);
    const b = prijs(12, null, "DAG", AANGEPAST, 320);
    const c = prijs(12, "DAG", "DAG", AANGEPAST, 320);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("werktempo 0, leeg of ontbrekend telt geen arbeid mee en geeft een waarschuwing", () => {
    for (const w of [0, null]) {
      const r = reken([product({ id: "p", productiviteit: w as number, werktempoEenheid: "DAG" })], { hoeveelheden: { p: 10 } }, kosten("DAGDEEL", STANDAARD_UREN, 200));
      expect(r.onderdelen[0]!.kosten.arbeid).toBe(0);
      expect(r.waarschuwingen.some((x) => x.code === "geen-werktempo")).toBe(true);
    }
  });
});

// ---- Plannen -------------------------------------------------------------------------------------------------------------

const P = (id: string, eenheid: WerktempoEenheid | null, werktempo: number | null, tempos: (number | null)[] = [], override: number | null = null): PlanProduct => ({
  id,
  naam: id,
  eenheid,
  werktempo,
  materiaalTempos: tempos.map((w, i) => ({ id: `${id}-m${i}`, werktempo: w })),
  arbeidTariefOverride: override,
});

describe("planProductWissel", () => {
  it("naar een eigen eenheid: werktempo en materiaaltempo's mee, bijv. 12 m²/uur wordt 48 m²/dagdeel", () => {
    const w = planProductWissel(P("a", null, 12, [6, null]), "DAGDEEL", "UUR", STANDAARD_UREN);
    expect(w).toMatchObject({ eenheid: "DAGDEEL", werktempo: 48, van: "UUR", naar: "DAGDEEL", verandert: true });
    expect(w.materiaalTempos).toEqual([{ id: "a-m0", werktempo: 24 }, { id: "a-m1", werktempo: null }]);
  });
  it("terug naar Standaard rekent terug naar de eenheid van de rekentool", () => {
    const w = planProductWissel(P("a", "DAGDEEL", 48), null, "UUR", STANDAARD_UREN);
    expect(w).toMatchObject({ eenheid: null, werktempo: 12, van: "DAGDEEL", naar: "UUR" });
  });
  it("een product zonder werktempo blijft zonder werktempo", () => {
    expect(planProductWissel(P("a", null, null), "DAG", "UUR", STANDAARD_UREN).werktempo).toBeNull();
  });
  it("kiezen voor de eenheid die het al is verandert niets", () => {
    const w = planProductWissel(P("a", null, 12), "UUR", "UUR", STANDAARD_UREN);
    expect(w.verandert).toBe(false);
    expect(w.werktempo).toBe(12);
  });
});

describe("planGlobaleWissel", () => {
  const producten = [P("volgt", null, 12, [6]), P("eigen", "DAG", 96, [48]), P("volgt-tarief", null, 5, [], 60), P("leeg", null, null)];
  const plan = planGlobaleWissel({ producten, van: "UUR", naar: "DAGDEEL", tarief: 45, uren: STANDAARD_UREN });

  it("rekent de werktempo's van wie de standaard volgt om en laat producten met een eigen eenheid ongemoeid", () => {
    expect(plan.meeveranderend.map((p) => [p.id, p.werktempo])).toEqual([["volgt", 48], ["volgt-tarief", 20], ["leeg", null]]);
    expect(plan.meeveranderend[0]!.materiaalTempos).toEqual([{ id: "volgt-m0", werktempo: 24 }]);
    expect(plan.behouden.map((p) => p.id)).toEqual(["eigen"]);
    expect(plan.meeveranderend.every((p) => p.eenheid === null)).toBe(true);
  });
  it("neemt het tarief (en een eigen tarief) mee naar de nieuwe eenheid, zodat de prijs gelijk blijft", () => {
    expect(plan.nieuwTarief).toBe(180);
    expect(plan.meeveranderend[1]!.arbeidTariefOverride).toBe(240);
  });
  it("de prijs voor en na de wissel is gelijk, voor elk product, in elke richting", () => {
    for (const [naam, c] of CONFIGS) {
      for (const van of EENHEDEN) {
        for (const naar of EENHEDEN) {
          if (van === naar) continue;
          const tarief = 40 * urenPerEenheid(van, c);
          const pl = planGlobaleWissel({ producten, van, naar, tarief, uren: c });
          const voor = (p: PlanProduct, g: WerktempoEenheid, t: number, tempo: number | null) =>
            reken([product({ id: p.id, productiviteit: tempo, werktempoEenheid: p.eenheid })], { hoeveelheden: { [p.id]: 41 } }, kosten(g, c, t)).totaalInclCenten;
          for (const p of producten.filter((x) => x.werktempo !== null)) {
            const na = pl.meeveranderend.find((m) => m.id === p.id);
            const nieuwTempo = na ? na.werktempo : p.werktempo;
            expect(voor(p, naar, pl.nieuwTarief, nieuwTempo), `${naam} ${van}→${naar} ${p.id}`).toBe(voor(p, van, tarief, p.werktempo));
          }
        }
      }
    }
  });
  it("heen-en-weer wisselen van de rekentool geeft exact dezelfde waarden", () => {
    const heen = planGlobaleWissel({ producten, van: "UUR", naar: "DAG", tarief: 45, uren: AANGEPAST });
    const terugProducten = producten.map((p) => {
      const m = heen.meeveranderend.find((x) => x.id === p.id);
      return m ? { ...p, werktempo: m.werktempo, materiaalTempos: m.materiaalTempos, arbeidTariefOverride: m.arbeidTariefOverride } : p;
    });
    const terug = planGlobaleWissel({ producten: terugProducten, van: "DAG", naar: "UUR", tarief: heen.nieuwTarief, uren: AANGEPAST });
    expect(terug.nieuwTarief).toBe(45);
    expect(terug.meeveranderend.map((m) => m.werktempo)).toEqual([12, 5, null]);
    expect(terug.meeveranderend[1]!.arbeidTariefOverride).toBe(60);
  });
});

describe("planUrenWissel", () => {
  const producten = [P("volgt", null, 12), P("zelfde", "DAG", 96), P("eigen", "UUR", 12, [6]), P("leeg", "DAGDEEL", null)];
  const plan = planUrenWissel({ producten, globaal: "DAG", oud: STANDAARD_UREN, nieuw: { urenPerDagdeel: 4, urenPerDag: 7 } });

  it("raakt alleen producten met een andere eigen eenheid dan de rekentool", () => {
    expect(plan.rakend.map((r) => r.id)).toEqual(["eigen", "leeg"]);
  });
  it("het nieuwe werktempo houdt de prijs gelijk", () => {
    const k = (c: UrenConfig) => kosten("DAG", c, 320);
    const nieuw: UrenConfig = { urenPerDagdeel: 4, urenPerDag: 7 };
    const voor = reken([product({ id: "e", productiviteit: 12, werktempoEenheid: "UUR" })], { hoeveelheden: { e: 41 } }, k(STANDAARD_UREN)).totaalInclCenten;
    const metGelijkePrijs = plan.rakend[0]!.nieuwWerktempo!;
    const na = reken([product({ id: "e", productiviteit: metGelijkePrijs, werktempoEenheid: "UUR" })], { hoeveelheden: { e: 41 } }, k(nieuw)).totaalInclCenten;
    const zonder = reken([product({ id: "e", productiviteit: 12, werktempoEenheid: "UUR" })], { hoeveelheden: { e: 41 } }, k(nieuw)).totaalInclCenten;
    expect(na).toBe(voor);
    expect(zonder).not.toBe(voor); // laat je de waarde staan, dan verandert de prijs (daarom de keuze in de dialog)
    expect(plan.rakend[0]!.nieuweMateriaalTempos[0]!.werktempo).toBeCloseTo(6 * (8 / 7), 9);
  });
});

