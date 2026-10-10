import { beforeEach, describe, expect, it } from "vitest";
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
