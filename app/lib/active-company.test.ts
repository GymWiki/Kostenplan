import { describe, expect, it } from "vitest";
import { resolveActiveMembership } from "./active-company";

describe("resolveActiveMembership", () => {
  const a = { companyId: "company-a" };
  const b = { companyId: "company-b" };
  const c = { companyId: "company-c" };

  it("kiest het lidmaatschap dat overeenkomt met de cookie", () => {
    expect(resolveActiveMembership([a, b, c], "company-b")).toBe(b);
  });

  it("valt terug op het eerste lidmaatschap als de cookie ontbreekt", () => {
    expect(resolveActiveMembership([a, b, c], undefined)).toBe(a);
  });

  it("valt terug op het eerste lidmaatschap bij een vervalste/onbekende cookie-waarde", () => {
    expect(resolveActiveMembership([a, b, c], "niet-mijn-bedrijf")).toBe(a);
  });

  it("werkt met precies één lidmaatschap (bestaande, gemigreerde gebruiker)", () => {
    expect(resolveActiveMembership([a], undefined)).toBe(a);
    expect(resolveActiveMembership([a], "iets-anders")).toBe(a);
  });

  it("gooit een fout bij een lege lijst (kan in de praktijk niet voorkomen)", () => {
    expect(() => resolveActiveMembership([], "x")).toThrow();
  });
});
