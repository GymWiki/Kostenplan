import { describe, expect, it } from "vitest";
import { veiligVolgende } from "./volgende";

describe("veiligVolgende", () => {
  it("laat interne paden door", () => {
    expect(veiligVolgende("/probeer/importeren")).toBe("/probeer/importeren");
  });
  it("weigert externe en rare adressen", () => {
    for (const x of ["https://evil.nl", "//evil.nl", "/\\evil.nl", "javascript:alert(1)", undefined, 5, "/a\nb"]) {
      expect(veiligVolgende(x)).toBe("/dashboard");
    }
  });
});
