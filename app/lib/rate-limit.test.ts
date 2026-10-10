import { beforeEach, describe, expect, it, vi } from "vitest";
import { beperk, resetGeheugenLimieten } from "./rate-limit";

describe("beperk (geheugen)", () => {
  beforeEach(() => resetGeheugenLimieten());

  it("staat tot het maximum toe en blokkeert daarna", async () => {
    for (let i = 0; i < 5; i++) expect((await beperk("a", 5, 3600)).toegestaan).toBe(true);
    expect((await beperk("a", 5, 3600)).toegestaan).toBe(false);
  });

  it("telt per sleutel", async () => {
    await beperk("a", 1, 3600);
    expect((await beperk("a", 1, 3600)).toegestaan).toBe(false);
    expect((await beperk("b", 1, 3600)).toegestaan).toBe(true);
  });
});

describe("zonder Upstash", () => {
  it("waarschuwt één keer en blijft werken", async () => {
    const waarschuw = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.UPSTASH_REDIS_REST_URL;
    resetGeheugenLimieten();
    await beperk("w", 5, 60);
    await beperk("w", 5, 60);
    expect(waarschuw).toHaveBeenCalledTimes(1);
    waarschuw.mockRestore();
  });
});
