import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));


const { isOwnStorageUrl: isOwn } = await import("./storage");
const BASIS = "https://x.supabase.co/storage/v1/object/public/";

describe("tenant-scoping (audit #67)", () => {
  it("isOwnStorageUrl accepteert alleen bestanden in de map van het eigen bedrijf", () => {
    const bucket = BASIS + "product-fotos";
    const eigen = isOwn(`${bucket}/bedrijf-a/logo.png`, "bedrijf-a");
    const vreemd = isOwn(`${bucket}/bedrijf-b/logo.png`, "bedrijf-a");
    expect(vreemd).toBe(false);
    expect(isOwn("https://evil.example/logo.png", "bedrijf-a")).toBe(false);
    expect(isOwn(`${bucket}/bedrijf-a/../bedrijf-b/logo.png`, "bedrijf-a")).toBe(false);
    expect(eigen).toBe(true);
  });

  it.each([
    ["app/lib/actions/offertes.ts", "syncOfferteVerval"],
    ["app/lib/actions/onboarding.ts", "markOnboardingVoltooid"],
    ["app/lib/actions/analytics.ts", "recordAnalyticsEvent"],
  ])("%s exporteert %s niet meer als server action", (bestand, naam) => {
    const bron = readFileSync(bestand, "utf8");
    expect(bron).not.toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${naam}\\b`));
  });
});
