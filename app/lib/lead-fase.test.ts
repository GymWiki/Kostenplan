import { describe, expect, it } from "vitest";
import { bepaalFase, FASE_FILTERS, valtOnderFilter, volgendeActie, type FaseInvoer, type LeadFactuur } from "./lead-fase";

const nu = new Date("2026-10-20T10:00:00Z");
const basis: FaseInvoer = { status: "NIEUW", inContactOp: null, ingeplandStartweek: null, opgeleverdOp: null, verlorenReden: null, offerte: null, facturen: [] };
const offerte = (status: NonNullable<FaseInvoer["offerte"]>["status"], geldigTot: Date | null = new Date("2026-12-01")) => ({ status, geldigTot });
const factuur = (p: Partial<LeadFactuur> = {}): LeadFactuur => ({ id: "f1", nummer: "F2026-0001", soort: "factuur", status: "VERSTUURD", totaalInclCenten: 100000, openstaandCenten: 100000, vervaldatum: "2026-11-03", ...p });
const fase = (p: Partial<FaseInvoer>) => bepaalFase({ ...basis, ...p }, nu);

describe("bepaalFase: hoofdpad", () => {
  it("doorloopt Nieuw → … → Betaald", () => {
    expect(fase({}).fase).toBe("nieuw");
    expect(fase({ inContactOp: nu }).fase).toBe("in-contact");
    expect(fase({ offerte: offerte("CONCEPT") }).fase).toBe("in-contact");
    expect(fase({ offerte: offerte("VERSTUURD") }).fase).toBe("offerte-verstuurd");
    expect(fase({ offerte: offerte("BEKEKEN") }).fase).toBe("offerte-verstuurd");
    expect(fase({ offerte: offerte("GEACCEPTEERD") }).fase).toBe("akkoord");
    expect(fase({ offerte: offerte("GEACCEPTEERD"), ingeplandStartweek: "2026-W45" }).fase).toBe("ingepland");
    expect(fase({ offerte: offerte("GEACCEPTEERD"), ingeplandStartweek: "2026-W45", opgeleverdOp: new Date("2026-11-20") }).fase).toBe("opgeleverd");
    const o = { offerte: offerte("GEACCEPTEERD"), opgeleverdOp: new Date("2026-11-20") };
    expect(fase({ ...o, facturen: [factuur()] }).fase).toBe("gefactureerd");
    expect(fase({ ...o, facturen: [factuur({ status: "BETAALD", openstaandCenten: 0 })] }).fase).toBe("betaald");
  });
  it("een concept-factuur maakt de lead nog niet Gefactureerd; hij blijft Te factureren", () => {
    const u = fase({ offerte: offerte("GEACCEPTEERD"), opgeleverdOp: nu, facturen: [factuur({ status: "CONCEPT", nummer: null })] });
    expect(u.fase).toBe("opgeleverd");
    expect(u.teFactureren).toBe(true);
  });
  it("alleen een aanbetaling (termijn) is nog niet Gefactureerd, maar telt wel als openstaand", () => {
    const u = fase({ offerte: offerte("GEACCEPTEERD"), facturen: [factuur({ soort: "termijn", openstaandCenten: 30000 })] });
    expect(u.fase).toBe("akkoord");
    expect(u.teFactureren).toBe(true);
    expect(u.openstaandCenten).toBe(30000);
  });
  it("eindfactuur na betaalde aanbetaling: Gefactureerd tot alles is betaald", () => {
    const aan = factuur({ id: "a", soort: "termijn", status: "BETAALD", openstaandCenten: 0 });
    const eind = factuur({ id: "e", soort: "eindfactuur", openstaandCenten: 70000 });
    expect(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [aan, eind] }).fase).toBe("gefactureerd");
    expect(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [aan, { ...eind, status: "BETAALD", openstaandCenten: 0 }] }).fase).toBe("betaald");
  });
  it("een geheel gecrediteerde factuur telt als afgerond", () => {
    expect(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [factuur({ status: "GECREDITEERD", openstaandCenten: 0 })] }).fase).toBe("betaald");
  });
});

describe("bepaalFase: zijpaden", () => {
  it("offerte verlopen (status of geldigTot verstreken)", () => {
    expect(fase({ offerte: offerte("VERLOPEN") }).fase).toBe("offerte-verlopen");
    expect(fase({ offerte: offerte("VERSTUURD", new Date("2026-10-01")) }).fase).toBe("offerte-verlopen");
  });
  it("afgewezen en verloren (met reden)", () => {
    expect(fase({ offerte: offerte("AFGEWEZEN") }).fase).toBe("afgewezen");
    const u = fase({ status: "VERLOREN", verlorenReden: "Te duur", offerte: offerte("VERSTUURD") });
    expect(u.fase).toBe("verloren");
    expect(u.toelichting).toBe("Te duur");
  });
  it("een accepterende klant na verlopen of afgewezen wint van het zijpad niet: akkoord blijft akkoord", () => {
    expect(fase({ offerte: offerte("GEACCEPTEERD", new Date("2026-01-01")) }).fase).toBe("akkoord");
  });
});

describe("te laat, openstaand en filters", () => {
  it("te laat is afgeleid van de vervaldatum in Europe/Amsterdam", () => {
    const f = factuur({ vervaldatum: "2026-10-17" });
    const u = fase({ offerte: offerte("GEACCEPTEERD"), facturen: [f] });
    expect(u.teLaatDagen).toBe(3);
    expect(u.teLaatCenten).toBe(100000);
    expect(valtOnderFilter(u, "te-laat")).toBe(true);
    expect(valtOnderFilter(u, "openstaand")).toBe(true);
    expect(valtOnderFilter(u, "afgerond")).toBe(false);
    expect(volgendeActie(u, true, [f])).toMatchObject({ soort: "herinneren", factuurId: "f1" });
  });
  it("niet te laat vóór de vervaldatum en na betaling", () => {
    expect(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [factuur()] }).teLaatDagen).toBeNull();
    expect(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [factuur({ vervaldatum: "2026-10-01", status: "BETAALD", openstaandCenten: 0 })] }).teLaatDagen).toBeNull();
  });
  it("elke lead valt onder precies de verwachte filters; 'alle' telt iedereen", () => {
    const u = fase({ offerte: offerte("GEACCEPTEERD") });
    const chips = FASE_FILTERS.filter((c) => valtOnderFilter(u, c.waarde)).map((c) => c.waarde);
    expect(chips).toEqual(["alle", "akkoord", "te-factureren"]);
    expect(FASE_FILTERS.filter((c) => valtOnderFilter(fase({}), c.waarde)).map((c) => c.waarde)).toEqual(["alle", "nieuw"]);
  });
  it("de volgende actie volgt de fase", () => {
    expect(volgendeActie(fase({}), false)?.soort).toBe("in-contact");
    expect(volgendeActie(fase({ inContactOp: nu }), false)?.soort).toBe("offerte-maken");
    expect(volgendeActie(fase({ offerte: offerte("GEACCEPTEERD") }), true)?.soort).toBe("inplannen");
    expect(volgendeActie(fase({ offerte: offerte("GEACCEPTEERD"), ingeplandStartweek: "2026-W45" }), true)?.soort).toBe("opleveren");
    expect(volgendeActie(fase({ offerte: offerte("GEACCEPTEERD"), opgeleverdOp: nu }), true)?.soort).toBe("factureren");
    expect(volgendeActie(fase({ offerte: offerte("GEACCEPTEERD"), facturen: [factuur({ status: "BETAALD", openstaandCenten: 0 })] }), true)).toBeNull();
  });
});
