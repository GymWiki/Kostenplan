import { describe, expect, it } from "vitest";
import { factuurStatusKop } from "./status-kop";

describe("factuurStatusKop", () => {
  it("toont per status de echte stand", () => {
    expect(factuurStatusKop({ status: "CONCEPT" }).tekst).toBe("Concept");
    expect(factuurStatusKop({ status: "DEFINITIEF" }).tekst).toBe("Definitief – nog niet verstuurd");
    expect(factuurStatusKop({ status: "VERSTUURD", verstuurdOp: "2026-10-09T10:00:00Z" }).tekst).toBe("Verstuurd op 9 oktober 2026");
    expect(factuurStatusKop({ status: "DEELS_BETAALD" }).tekst).toBe("Deels betaald");
    expect(factuurStatusKop({ status: "BETAALD" }).tekst).toBe("Betaald");
    expect(factuurStatusKop({ status: "GECREDITEERD" }).tekst).toBe("Gecrediteerd");
  });
  it("een definitieve factuur die nog niet als verstuurd is bevestigd, heet nooit 'Verstuurd'", () => {
    expect(factuurStatusKop({ status: "DEFINITIEF", verstuurdOp: null }).tekst).not.toMatch(/Verstuurd/);
  });
  it("te laat gaat voor verstuurd en deels betaald, nooit voor betaald", () => {
    expect(factuurStatusKop({ status: "VERSTUURD", verstuurdOp: "2026-09-01", dagenTeLaat: 12 })).toEqual({ tekst: "Te laat", toon: "let-op" });
    expect(factuurStatusKop({ status: "DEELS_BETAALD", dagenTeLaat: 3 }).tekst).toBe("Te laat");
    expect(factuurStatusKop({ status: "BETAALD", dagenTeLaat: 3 }).tekst).toBe("Betaald");
  });
  it("rekent de datum in tijdzone Europe/Amsterdam", () => {
    expect(factuurStatusKop({ status: "VERSTUURD", verstuurdOp: "2026-10-09T23:30:00Z" }).tekst).toBe("Verstuurd op 10 oktober 2026");
  });
});
