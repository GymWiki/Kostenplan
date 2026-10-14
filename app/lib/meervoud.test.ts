import { describe, expect, it } from "vitest";
import { meervoud } from "./meervoud";

describe("meervoud", () => {
  it("enkelvoud bij precies 1, anders meervoud (ook bij 0)", () => {
    expect(meervoud(1, "onderdeel", "onderdelen")).toBe("1 onderdeel");
    expect(meervoud(2, "onderdeel", "onderdelen")).toBe("2 onderdelen");
    expect(meervoud(0, "regel", "regels")).toBe("0 regels");
    expect(meervoud(1, "dag", "dagen")).toBe("1 dag");
  });
});
