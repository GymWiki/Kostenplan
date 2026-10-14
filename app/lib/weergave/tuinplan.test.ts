import { describe, expect, it } from "vitest";
import { berekenPrijs } from "@/app/lib/pricing/engine";
import { configVanProducten } from "@/app/lib/pricing/adapters";
import { bouwLeadSnapshot } from "@/app/lib/lead-snapshot";
import { BASIS_KOSTEN, optie, product } from "@/app/lib/pricing/test-helpers";
import { actieveProducten, bewaarTuinplan, leesTuinplan, leegTuinplan, parseTuinplan, planInvoer, tuinplanSleutel, verwijderUitPlan, type Tuinplan } from "./tuinplan";

const schutting = product({ id: "s", eenheid: "m1", materiaalCategorieen: [{ id: "sc", naam: "Hout", materialen: [optie("sa", "Douglas", 40), optie("sb", "Hardhout", 90)] }], extraOpties: [{ id: "se", naam: "Afvoer", prijs: 5, type: "PER_EENHEID" }] });
const terras = product({ id: "t", eenheid: "m2", sjabloon: "AFMETINGEN", sjabloonConfig: { metDiepte: false }, materiaalCategorieen: [{ id: "tc", naam: "Tegel", materialen: [optie("ta", "Klinker", 30), optie("tb", "Tegel", 45)] }] });
const producten = [schutting, terras];

const plan: Tuinplan = {
  ...leegTuinplan(),
  toegevoegd: ["s", "t"],
  hoeveelheden: { s: 12 },
  sjabloonInvoer: { t: { lengte: 5, breedte: 4 } },
  materiaalKeuzes: { sc: "sb", tc: "ta" },
  extraKeuzes: { se: 1 },
};

const rekenOp = (weergave: "tegels" | "stappen" | "lijst", p: Tuinplan, open: string | null = null) => {
  const actief = actieveProducten(producten, weergave, p, open);
  const config = configVanProducten(producten, BASIS_KOSTEN);
  const invoer = planInvoer(actief, p);
  const resultaat = berekenPrijs(config, invoer);
  return { resultaat, snapshot: bouwLeadSnapshot({ config, invoer, resultaat }) };
};

describe("tuinplan", () => {
  it("dezelfde keuzes geven in alle drie de weergaven exact hetzelfde totaal en dezelfde aanvraag", () => {
    const lijst = rekenOp("lijst", plan);
    const tegels = rekenOp("tegels", plan);
    const stappen = rekenOp("stappen", plan);
    expect(lijst.resultaat.totaalInclCenten).toBeGreaterThan(0);
    expect(tegels.resultaat).toEqual(lijst.resultaat);
    expect(stappen.resultaat).toEqual(lijst.resultaat);
    expect(tegels.snapshot).toEqual(lijst.snapshot);
    expect(stappen.snapshot).toEqual(lijst.snapshot);
  });

  it("een onderdeel buiten het plan telt niet mee, ook al staat er invoer; het open onderdeel telt wel mee voor de live prijs", () => {
    const zonderTerras = { ...plan, toegevoegd: ["s"] };
    const a = rekenOp("tegels", zonderTerras);
    expect(a.resultaat.onderdelen.map((o) => o.id)).toEqual(["s"]);
    const live = rekenOp("tegels", zonderTerras, "t");
    expect(live.resultaat.onderdelen.map((o) => o.id).sort()).toEqual(["s", "t"]);
    // de lijst heeft geen "plan": wat is ingevuld telt mee
    expect(rekenOp("lijst", zonderTerras).resultaat.onderdelen.map((o) => o.id).sort()).toEqual(["s", "t"]);
  });

  it("verwijderen haalt invoer en keuzes van dat onderdeel weg en laat de rest ongemoeid", () => {
    const na = verwijderUitPlan(plan, schutting);
    expect(na.toegevoegd).toEqual(["t"]);
    expect(na.hoeveelheden).toEqual({});
    expect(na.materiaalKeuzes).toEqual({ tc: "ta" });
    expect(na.extraKeuzes).toEqual({});
    expect(na.sjabloonInvoer).toEqual(plan.sjabloonInvoer);
  });

  it("bewaart en herstelt via sessionStorage en gooit onbekende ids weg", () => {
    const opslag = new Map<string, string>();
    const fake = { getItem: (k: string) => opslag.get(k) ?? null, setItem: (k: string, v: string) => void opslag.set(k, v), removeItem: (k: string) => void opslag.delete(k) };
    bewaarTuinplan("tool1", plan, fake);
    expect(leesTuinplan("tool1", producten, fake)).toEqual(plan);
    expect(leesTuinplan("tool2", producten, fake)).toBeNull();
    // alleen onderdeel s bestaat nog
    const kleiner = leesTuinplan("tool1", [schutting], fake)!;
    expect(kleiner.toegevoegd).toEqual(["s"]);
    expect(Object.keys(kleiner.sjabloonInvoer)).toEqual([]);
    expect(kleiner.materiaalKeuzes).toEqual({ sc: "sb" });
  });

  it("kapotte of vreemde opslag geeft nooit een fout", () => {
    const stuk = { getItem: () => "{kapot", setItem: () => { throw new Error("vol"); }, removeItem: () => {} };
    expect(leesTuinplan("t", producten, stuk)).toBeNull();
    expect(() => bewaarTuinplan("t", plan, stuk)).not.toThrow();
    expect(parseTuinplan([], producten)).toBeNull();
    expect(parseTuinplan({ toegevoegd: "x", hoeveelheden: { s: "12" } }, producten)).toEqual(leegTuinplan());
    expect(leesTuinplan("t", producten, null)).toBeNull();
    expect(tuinplanSleutel("abc")).toBe("kp:tuinplan:abc");
  });
});
