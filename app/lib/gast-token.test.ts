import { beforeAll, describe, expect, it } from "vitest";
import { controleerGastBewijs, gastOvernameActief, maakGastBewijs } from "./gast-token";

beforeAll(() => {
  process.env.GAST_TOKEN_SECRET = "test-geheim";
});

describe("gast-bewijs", () => {
  it("geldt zolang het niet verlopen of gewijzigd is", () => {
    const t = maakGastBewijs({ gastUserId: "u1", companyId: "c1" }, 1000, 0);
    expect(controleerGastBewijs(t, 500)).toMatchObject({ gastUserId: "u1", companyId: "c1" });
    expect(controleerGastBewijs(t, 2000)).toBeNull();
  });
  it("weigert een aangepaste of onbekende token", () => {
    const t = maakGastBewijs({ gastUserId: "u1", companyId: "c1" }, 1000, 0);
    const [p, s] = t.split(".");
    const vals = Buffer.from(JSON.stringify({ gastUserId: "u2", companyId: "c1", verlooptOp: 99999999 })).toString("base64url");
    expect(controleerGastBewijs(`${vals}.${s}`, 1)).toBeNull();
    expect(controleerGastBewijs(`${p}.xxx`, 1)).toBeNull();
    expect(controleerGastBewijs(undefined)).toBeNull();
  });
});

describe("zonder GAST_TOKEN_SECRET", () => {
  it("is overname uitgeschakeld en crasht niets", () => {
    const oud = process.env.GAST_TOKEN_SECRET;
    delete process.env.GAST_TOKEN_SECRET;
    expect(gastOvernameActief()).toBe(false);
    expect(controleerGastBewijs("a.b")).toBeNull();
    process.env.GAST_TOKEN_SECRET = oud;
    expect(gastOvernameActief()).toBe(true);
  });
});
