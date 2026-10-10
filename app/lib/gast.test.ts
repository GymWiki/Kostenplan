import { describe, expect, it } from "vitest";
import { bepaalBron, normaliseerSite } from "./gast";
import { extractBranding } from "./branding-extract";

describe("normaliseerSite", () => {
  it("normaliseert gewone sites", () => {
    expect(normaliseerSite("voorbeeld.nl")).toBe("https://voorbeeld.nl");
    expect(normaliseerSite(" https://www.Voorbeeld.nl/over-ons?x=1 ")).toBe("https://www.voorbeeld.nl");
    expect(normaliseerSite("http://tuinen.example.com:443")).toBe("https://tuinen.example.com");
  });
  it("weigert onzin, interne adressen en andere protocollen", () => {
    for (const x of ["", "  ", "localhost", "http://localhost:3000", "127.0.0.1", "http://10.0.0.5", "http://169.254.169.254/latest", "[::1]", "javascript:alert(1)", "ftp://x.nl", "a b.nl", "intern", "https://user:pw@x.nl", "http://x.nl:8080", "mijn.local", "x".repeat(300) + ".nl"]) {
      expect(normaliseerSite(x), x).toBeNull();
    }
    expect(normaliseerSite(null)).toBeNull();
  });
});

describe("bepaalBron", () => {
  it("kiest utm, anders link-met-site, anders direct", () => {
    expect(bepaalBron({ utm_source: "linkedin", utm_campaign: "mei" }).bron).toBe("linkedin/mei");
    expect(bepaalBron({ metSiteParam: true }).bron).toBe("link-met-site");
    expect(bepaalBron({}).bron).toBe("direct");
    expect(bepaalBron({ utm_source: "<script>x" }).bron).not.toContain("<");
  });
});

describe("branding-extractie weigert interne adressen (SSRF)", () => {
  for (const url of ["http://localhost", "http://127.0.0.1", "http://10.1.2.3", "http://192.168.0.1", "http://169.254.169.254/latest/meta-data", "http://[::1]/"]) {
    it(url, async () => {
      const r = await extractBranding(url, "test-bedrijf");
      expect(r.success).toBe(false);
    });
  }
});
