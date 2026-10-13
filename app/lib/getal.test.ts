import { describe, expect, it } from "vitest";
import { formatBedragInvoer, formatGetalInvoer, parseBedrag, parseGetal } from "./getal";

const goed: [string, number][] = [
  ["12,50", 12.5],
  ["12.50", 12.5],
  ["1.250,50", 1250.5],
  ["1,250.50", 1250.5],
  ["1250", 1250],
  ["€ 12,50", 12.5],
  [" 12,5 ", 12.5],
  ["€12.50", 12.5],
  ["1.250", 1250],
  ["1.250.000", 1250000],
  ["1.250.000,25", 1250000.25],
  ["0,5", 0.5],
  [",5", 0.5],
  ["0.5", 0.5],
  ["0.250", 0.25],
  ["12.5", 12.5],
  ["12,", 12],
  ["12.", 12],
  ["0", 0],
  ["0,00", 0],
  ["12 ,50", 12.5],
  ["1 250,50", 1250.5],
  ["7", 7],
  ["88,87", 88.87],
  ["20.70", 20.7],
  ["999.999,99", 999999.99],
];
const fout: string[] = ["abc", "", "   ", "1,2,3", "1.2.3", "12,5x", "€", ",", ".", "1,250,50", "1.25.0", "12-5", "--5", "1..2", "1.250,50,3", "1,5.5,5"];

describe("parseGetal / parseBedrag (nl-NL)", () => {
  it.each(goed)("leest %s als %d", (invoer, verwacht) => {
    expect(parseGetal(invoer)).toEqual({ ok: true, waarde: verwacht });
  });

  it.each(fout)("weigert %j met een Nederlandse melding", (invoer) => {
    const r = parseGetal(invoer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fout).toMatch(/^(Vul|Een)/);
  });

  it("geeft nooit stilzwijgend 0 bij ongeldige invoer", () => {
    expect(parseGetal("abc")).toMatchObject({ ok: false });
    expect(parseBedrag("abc")).toMatchObject({ ok: false });
  });

  it("negatief alleen waar het mag, met melding", () => {
    expect(parseGetal("-5")).toEqual({ ok: false, fout: "Een bedrag onder nul kan hier niet." });
    expect(parseGetal("-5", { soort: "aantal" })).toEqual({ ok: false, fout: "Een negatief getal kan hier niet." });
    expect(parseGetal("-5,5", { negatief: true })).toEqual({ ok: true, waarde: -5.5 });
    expect(parseGetal("-0")).toEqual({ ok: true, waarde: 0 });
  });

  it("min en max", () => {
    expect(parseGetal("0", { min: 1, soort: "aantal" })).toEqual({ ok: false, fout: "Vul minimaal 1 in." });
    expect(parseGetal("1000000", { max: 999999 })).toEqual({ ok: false, fout: "Vul maximaal 999.999 in." });
  });

  it("bedrag in centen, afgerond op hele centen", () => {
    expect(parseBedrag("12,50")).toEqual({ ok: true, centen: 1250 });
    expect(parseBedrag("12.50")).toEqual({ ok: true, centen: 1250 });
    expect(parseBedrag("1.250,50")).toEqual({ ok: true, centen: 125050 });
    expect(parseBedrag("1.005")).toEqual({ ok: true, centen: 100500 });
    expect(parseBedrag("0,005")).toEqual({ ok: true, centen: 1 });
    expect(parseBedrag("88,87")).toEqual({ ok: true, centen: 8887 });
    expect(parseBedrag("20,7")).toEqual({ ok: true, centen: 2070 });
    expect(parseBedrag("-1")).toMatchObject({ ok: false });
    expect(parseBedrag("0,50", { minCenten: 100 })).toEqual({ ok: false, fout: "Vul minimaal 1,00 in." });
  });

  it("toont altijd met komma", () => {
    expect(formatBedragInvoer(1250)).toBe("12,50");
    expect(formatBedragInvoer(125050)).toBe("1250,50");
    expect(formatGetalInvoer(12.5)).toBe("12,5");
    expect(formatGetalInvoer(3)).toBe("3");
  });
});
