import { describe, expect, it } from "vitest";
import { bouwStatistiek, weergaveLabel } from "./statistiek";

describe("statistiek per rekentool", () => {
  it("telt bezoekers, toevoegingen en aanvragen en zet de weergaven naast elkaar", () => {
    const s = bouwStatistiek([
      { toolId: "a", type: "VISIT", weergave: "tegels", plaatsing: "inline", aantal: 30 },
      { toolId: "a", type: "VISIT", weergave: "lijst", plaatsing: "inline", aantal: 10 },
      { toolId: "a", type: "VISIT", weergave: null, plaatsing: null, aantal: 5 },
      { toolId: "a", type: "ONDERDEEL_TOEGEVOEGD", weergave: "tegels", plaatsing: "inline", aantal: 18 },
      { toolId: "a", type: "ONDERDEEL_TOEGEVOEGD", weergave: "lijst", plaatsing: "inline", aantal: 4 },
      { toolId: "a", type: "AANVRAAG_VERSTUURD", weergave: "tegels", plaatsing: "inline", aantal: 3 },
      { toolId: "a", type: "LEAD", weergave: null, plaatsing: null, aantal: 4 },
      { toolId: "a", type: "POPUP_GEOPEND", weergave: "tegels", plaatsing: "popup", aantal: 9 },
      { toolId: "b", type: "VISIT", weergave: "stappen", plaatsing: "popup", aantal: 2 },
    ]);
    const a = s.get("a")!;
    expect(a).toMatchObject({ bezoekers: 45, toevoegingen: 22, aanvragen: 4 });
    expect(a.perWeergave.map((w) => [w.label, w.bezoekers, w.toevoegingen, w.aanvragen])).toEqual([
      ["Tegels, in de pagina", 30, 18, 3],
      ["Alles op één pagina, in de pagina", 10, 4, 0],
    ]);
    expect(s.get("b")!.perWeergave[0].label).toBe("Stappen, pop-up");
    expect(s.get("c")).toBeUndefined();
  });

  it("labels", () => {
    expect(weergaveLabel("tegels", "popup")).toBe("Tegels, pop-up");
    expect(weergaveLabel("onbekend", null)).toBe("onbekend, in de pagina");
  });
});
