import { describe, expect, it } from "vitest";
import { pivotFunnel } from "./gast-funnel";

describe("pivotFunnel", () => {
  const rijen = [
    { week: "2026-10-12", bron: "linkedin", type: "probeer_bekeken", aantal: 10 },
    { week: "2026-10-12", bron: "direct", type: "probeer_bekeken", aantal: 4 },
    { week: "2026-10-12", bron: "linkedin", type: "account_gemaakt_google", aantal: 2 },
    { week: "2026-10-05", bron: "direct", type: "probeer_bekeken", aantal: 7 },
  ];
  it("groepeert per week (nieuwste eerst)", () => {
    const t = pivotFunnel(rijen, "week");
    expect(t.map((x) => x.naam)).toEqual(["2026-10-12", "2026-10-05"]);
    expect(t[0].waarden.probeer_bekeken).toBe(14);
  });
  it("groepeert per bron (meeste bezoek eerst)", () => {
    const t = pivotFunnel(rijen, "bron");
    expect(t[0].naam).toBe("direct");
    expect(t.find((x) => x.naam === "linkedin")?.waarden.account_gemaakt_google).toBe(2);
  });
});
