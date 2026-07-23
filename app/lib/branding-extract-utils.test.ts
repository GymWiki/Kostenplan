import { describe, expect, it } from "vitest";
import {
  isPrivateIp,
  normalizeUrl,
  cssColorToHex,
  splitCssRules,
  collectWeightedColors,
  topColors,
  isSystemFont,
  extractFontFamilyFromGoogleFontsHref,
  extractFontFamilyFromCss,
} from "./branding-extract-utils";

describe("isPrivateIp — SSRF-preventie", () => {
  it("blokkeert loopback, private en link-local IPv4-ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // cloud metadata-endpoint
    expect(isPrivateIp("0.0.0.0")).toBe(true);
  });

  it("blokkeert IPv6 loopback en link-local/unique-local", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fd12:3456:789a::1")).toBe(true);
  });

  it("blokkeert IPv4-mapped IPv6-adressen die een privaat IPv4 verbergen", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true);
  });

  it("staat echte publieke IPv4- en IPv6-adressen toe", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
  });

  it("blokkeert onherkenbare input (fail closed)", () => {
    expect(isPrivateIp("niet-een-ip")).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("voegt https:// toe als er geen scheme is", () => {
    expect(normalizeUrl("jouwbedrijf.nl")).toBe("https://jouwbedrijf.nl/");
  });

  it("laat een bestaand https-scheme intact", () => {
    expect(normalizeUrl("https://jouwbedrijf.nl")).toBe("https://jouwbedrijf.nl/");
  });

  it("staat http toe", () => {
    expect(normalizeUrl("http://jouwbedrijf.nl")).toBe("http://jouwbedrijf.nl/");
  });

  it("weigert andere schemes", () => {
    expect(() => normalizeUrl("ftp://jouwbedrijf.nl")).toThrow();
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow();
  });

  it("gooit bij een onparsebare URL", () => {
    expect(() => normalizeUrl("http://")).toThrow();
  });
});

describe("cssColorToHex", () => {
  it("parset 6-cijferige en 3-cijferige hex", () => {
    expect(cssColorToHex("#15803D")).toBe("#15803d");
    expect(cssColorToHex("#0f0")).toBe("#00ff00");
  });

  it("parset rgb() en rgba()", () => {
    expect(cssColorToHex("rgb(21, 128, 61)")).toBe("#15803d");
    expect(cssColorToHex("rgba(21, 128, 61, 0.5)")).toBe("#15803d");
  });

  it("parset hsl() en hsla()", () => {
    expect(cssColorToHex("hsl(0, 100%, 50%)")).toBe("#ff0000");
  });

  it("geeft null voor onherkende waarden", () => {
    expect(cssColorToHex("currentColor")).toBeNull();
    expect(cssColorToHex("var(--primary)")).toBeNull();
  });
});

describe("splitCssRules", () => {
  it("splitst platte regels in selector + body", () => {
    const rules = splitCssRules(".btn { color: red; } a { color: blue; }");
    expect(rules).toEqual([
      { selector: ".btn", body: " color: red; " },
      { selector: "a", body: " color: blue; " },
    ]);
  });

  it("daalt af in @media-blokken i.p.v. ze te negeren", () => {
    const rules = splitCssRules("@media (min-width: 600px) { .btn { color: red; } }");
    expect(rules).toEqual([{ selector: ".btn", body: " color: red; " }]);
  });

  it("negeert comments", () => {
    const rules = splitCssRules("/* comment { fake: rule; } */ .btn { color: red; }");
    expect(rules).toHaveLength(1);
    expect(rules[0].selector).toBe(".btn");
  });
});

describe("collectWeightedColors", () => {
  it("weegt interactieve selectors (button/.btn/a/header/.nav) 5x zwaarder", () => {
    const rules = splitCssRules(
      ".btn { background-color: #e8a020; } .footnote { color: #e8a020; } .other { color: #3355ff; }"
    );
    const counts = collectWeightedColors(rules);
    // #e8a020 komt 2x voor (1x gewogen ×5 via .btn, 1x gewogen ×1 via .footnote) = 6
    expect(counts.get("#e8a020")).toBe(6);
    expect(counts.get("#3355ff")).toBe(1);
  });

  it("filtert grijstinten/wit/zwart eruit", () => {
    const rules = splitCssRules(".btn { color: #ffffff; background: #000000; border: 1px solid #888888; }");
    const counts = collectWeightedColors(rules);
    expect(counts.size).toBe(0);
  });

  it("topColors sorteert op gewicht, hoogste eerst", () => {
    const rules = splitCssRules(
      "button { color: #112233; } .btn { color: #112233; } a { color: #445566; }"
    );
    const counts = collectWeightedColors(rules);
    expect(topColors(counts, 1)).toEqual(["#112233"]);
  });
});

describe("font-herkenning", () => {
  it("haalt de eerste fontnaam uit een Google Fonts-href", () => {
    expect(
      extractFontFamilyFromGoogleFontsHref(
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Roboto"
      )
    ).toBe("Poppins");
  });

  it("geeft null voor een systeemfont-achtige naam", () => {
    expect(isSystemFont("Arial")).toBe(true);
    expect(isSystemFont("system-ui")).toBe(true);
    expect(isSystemFont("Poppins")).toBe(false);
  });

  it("haalt font-family van body-selector uit CSS-regels", () => {
    const rules = splitCssRules('body { font-family: "Playfair Display", serif; margin: 0; }');
    expect(extractFontFamilyFromCss(rules)).toBe("Playfair Display");
  });

  it("negeert een system-stack font-family op body", () => {
    const rules = splitCssRules("body { font-family: -apple-system, sans-serif; }");
    expect(extractFontFamilyFromCss(rules)).toBeNull();
  });
});
