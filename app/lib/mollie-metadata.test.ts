import { describe, expect, it } from "vitest";
import { parseMollieMetadata } from "./mollie-metadata";

describe("parseMollieMetadata", () => {
  it("parseert nieuwe, company-gebonden metadata", () => {
    expect(parseMollieMetadata({ companyId: "company-1", plan: "PLUS", interval: "MAANDELIJKS" })).toEqual({
      companyId: "company-1",
      legacyUserId: null,
      plan: "PLUS",
      interval: "MAANDELIJKS",
    });
  });

  it("parseert oude, vóór-migratie metadata die alleen userId bevat", () => {
    expect(parseMollieMetadata({ userId: "user-1", plan: "PRO", interval: "JAARLIJKS" })).toEqual({
      companyId: null,
      legacyUserId: "user-1",
      plan: "PRO",
      interval: "JAARLIJKS",
    });
  });

  it("geeft companyId voorrang als beide velden aanwezig zijn", () => {
    const result = parseMollieMetadata({
      companyId: "company-1",
      userId: "user-1",
      plan: "PLUS",
      interval: "MAANDELIJKS",
    });
    expect(result?.companyId).toBe("company-1");
    expect(result?.legacyUserId).toBe("user-1");
  });

  it("wijst metadata zonder companyId én zonder userId af", () => {
    expect(parseMollieMetadata({ plan: "PLUS", interval: "MAANDELIJKS" })).toBeNull();
  });

  it("wijst een onbekend plan af", () => {
    expect(parseMollieMetadata({ companyId: "c", plan: "GRATIS", interval: "MAANDELIJKS" })).toBeNull();
  });

  it("wijst een onbekend interval af", () => {
    expect(parseMollieMetadata({ companyId: "c", plan: "PLUS", interval: "WEKELIJKS" })).toBeNull();
  });

  it("wijst niet-objecten en null af", () => {
    expect(parseMollieMetadata(null)).toBeNull();
    expect(parseMollieMetadata(undefined)).toBeNull();
    expect(parseMollieMetadata("companyId=1")).toBeNull();
    expect(parseMollieMetadata(42)).toBeNull();
  });
});
