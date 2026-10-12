import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/lib/prisma", () => ({ prisma: {} }));
const { kiesHoofdactie, eersteRegelNaam } = await import("./vandaag");

const stap = (klaar: boolean) => ({ id: "x", label: "x", klaar, href: "/" });
describe("kiesHoofdactie", () => {
  it("zonder rekentool: eerste rekentool maken", () => {
    expect(kiesHoofdactie({ nieuweLeads: 0, checklist: null, toolsTotaal: 0 })?.label).toBe("Maak je eerste rekentool");
  });
  it("nieuwe aanvragen gaan voor", () => {
    const k = { toolId: "t", toolNaam: "T", stappen: [stap(false)] };
    expect(kiesHoofdactie({ nieuweLeads: 2, checklist: k, toolsTotaal: 1 })?.label).toBe("Bekijk nieuwe aanvragen");
  });
  it("anders de rekentool afmaken", () => {
    const k = { toolId: "t", toolNaam: "T", stappen: [stap(true), stap(false)] };
    expect(kiesHoofdactie({ nieuweLeads: 0, checklist: k, toolsTotaal: 1 })).toEqual({ label: "Maak je rekentool af", href: "/dashboard/tools/t" });
  });
  it("is alles klaar: de aanvragen", () => {
    expect(kiesHoofdactie({ nieuweLeads: 0, checklist: null, toolsTotaal: 1 })?.label).toBe("Bekijk je aanvragen");
  });
});

describe("eersteRegelNaam", () => {
  it("toont de eerste werkzaamheid en het aantal extra", () => {
    expect(eersteRegelNaam({ regels: [{ naam: "Terras" }, { naam: "Schutting" }] })).toBe("Terras +1");
    expect(eersteRegelNaam({ regels: [{ naam: "Terras" }] })).toBe("Terras");
    expect(eersteRegelNaam(null)).toBe("Aanvraag");
  });
});
