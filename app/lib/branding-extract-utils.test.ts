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
  isAcceptedLogoContentType,
  normalizeContentType,
  validateLogoImage,
  pickSecondaryColor,
  cleanCompanyName,
  capitalizeSentence,
  truncateAtWordBoundary,
  detectOnderwerp,
  buildTitleSuggestions,
} from "./branding-extract-utils";

// Handgeschreven, minimale PNG-buffer — image-size leest alleen de
// signature, de "IHDR"-marker op byte 12 en width/height op byte 16/20, dus
// dit hoeft geen echt renderbare afbeelding te zijn.
function makePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.write("\x89PNG\r\n\x1a\n", 0, "binary");
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

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

describe("normalizeContentType / isAcceptedLogoContentType", () => {
  it("negeert charset-parameters", () => {
    expect(normalizeContentType("image/svg+xml; charset=utf-8")).toBe("image/svg+xml");
  });

  it("accepteert png/jpeg/webp/svg, niet gif of onbekend", () => {
    expect(isAcceptedLogoContentType("image/png")).toBe(true);
    expect(isAcceptedLogoContentType("image/jpeg")).toBe(true);
    expect(isAcceptedLogoContentType("image/webp")).toBe(true);
    expect(isAcceptedLogoContentType("image/svg+xml")).toBe(true);
    expect(isAcceptedLogoContentType("image/gif")).toBe(false);
    expect(isAcceptedLogoContentType("text/html")).toBe(false);
    expect(isAcceptedLogoContentType(null)).toBe(false);
  });
});

describe("validateLogoImage", () => {
  it("keurt SVG altijd goed zonder afmetingen te checken", () => {
    expect(validateLogoImage(Buffer.from("<svg/>"), "image/svg+xml")).toEqual({ ok: true });
  });

  it("keurt een normaal formaat logo goed", () => {
    expect(validateLogoImage(makePng(300, 120), "image/png")).toEqual({ ok: true });
  });

  it("wijst favicon-formaten af (te klein)", () => {
    const result = validateLogoImage(makePng(32, 32), "image/png");
    expect(result.ok).toBe(false);
  });

  it("wijst extreem langgerekte afbeeldingen af (ratio > 4:1)", () => {
    const result = validateLogoImage(makePng(1000, 100), "image/png");
    expect(result.ok).toBe(false);
  });

  it("wijst brede ~16:9 hero-foto's af", () => {
    const result = validateLogoImage(makePng(1600, 900), "image/png");
    expect(result.ok).toBe(false);
  });

  it("staat een kleinere 16:9-achtige afbeelding (geen hero-foto) wel toe", () => {
    // Zelfde ratio als hierboven, maar onder de 1200px-breedtegrens.
    expect(validateLogoImage(makePng(400, 225), "image/png")).toEqual({ ok: true });
  });

  it("wijst een ongeldig bestandstype af", () => {
    const result = validateLogoImage(makePng(300, 120), "application/pdf");
    expect(result.ok).toBe(false);
  });

  it("wijst onleesbare afbeeldingsdata af", () => {
    const result = validateLogoImage(Buffer.from("niet een echte afbeelding"), "image/png");
    expect(result.ok).toBe(false);
  });
});

describe("pickSecondaryColor", () => {
  it("wijst een grijstint af", () => {
    expect(pickSecondaryColor("#15803d", "#888888")).toBeNull();
  });

  it("wijst een kleur die te dicht bij primary ligt af", () => {
    expect(pickSecondaryColor("#15803d", "#16813e")).toBeNull();
  });

  it("wijst een kleur die bijna gelijk is aan de achtergrondkleur af", () => {
    expect(pickSecondaryColor("#15803d", "#f8f9fa", "#f7f8f9")).toBeNull();
  });

  it("accepteert een duidelijk onderscheiden, verzadigde kleur", () => {
    expect(pickSecondaryColor("#15803d", "#e8a020")).toBe("#e8a020");
  });

  it("geeft null als er geen kandidaat is", () => {
    expect(pickSecondaryColor("#15803d", null)).toBeNull();
  });
});

describe("cleanCompanyName", () => {
  it("pakt het eerste zinvolle segment bij een gescheiden titel", () => {
    expect(cleanCompanyName("Vincent Kok Tuinen | Hoveniersbedrijf")).toBe("Vincent Kok Tuinen");
  });

  it("negeert generieke segmenten als 'Home'", () => {
    expect(cleanCompanyName("Home | Jansen Hoveniers")).toBe("Jansen Hoveniers");
  });

  it("strip 'Welkom bij' als prefix", () => {
    expect(cleanCompanyName("Welkom bij De Groene Vingers")).toBe("De Groene Vingers");
  });

  it("laat een hyphen binnen een bedrijfsnaam intact (splitst niet op kale '-')", () => {
    expect(cleanCompanyName("Jansen-de Boer Tuinen")).toBe("Jansen-de Boer Tuinen");
  });

  it("laat een titel zonder scheidingsteken ongewijzigd", () => {
    expect(cleanCompanyName("Tuinbedrijf Verhoeven")).toBe("Tuinbedrijf Verhoeven");
  });
});

describe("capitalizeSentence", () => {
  it("zet de eerste letter in hoofdletter", () => {
    expect(capitalizeSentence("bereken direct uw prijs")).toBe("Bereken direct uw prijs");
  });

  it("zet ALL CAPS-tekst om naar leesbare zin-case", () => {
    expect(capitalizeSentence("BEREKEN DIRECT UW PRIJS")).toBe("Bereken direct uw prijs");
  });

  it("laat normale gemengde casing verder ongemoeid", () => {
    expect(capitalizeSentence("welkom bij TuinCo")).toBe("Welkom bij TuinCo");
  });
});

describe("truncateAtWordBoundary", () => {
  it("laat korte tekst ongewijzigd", () => {
    expect(truncateAtWordBoundary("Bereken direct uw prijs", 60)).toBe("Bereken direct uw prijs");
  });

  it("kapt af op de laatste woordgrens vóór de limiet", () => {
    expect(truncateAtWordBoundary("Bereken direct de kosten van uw prachtige nieuwe tuin", 30)).toBe(
      "Bereken direct de kosten van"
    );
  });
});

describe("detectOnderwerp", () => {
  it("herkent alle vier de bestaande doelgroepen", () => {
    expect(detectOnderwerp("Hoveniersbedrijf voor tuinaanleg")).toBe("uw tuin");
    expect(detectOnderwerp("Specialist in bestrating en oprit")).toBe("uw bestrating");
    expect(detectOnderwerp("Schilder voor al uw schilderwerk")).toBe("uw schilderwerk");
    expect(detectOnderwerp("Klusbedrijf voor elke verbouwing")).toBe("uw klus");
  });

  it("herkent de extra vakgebieden uit de opdracht", () => {
    expect(detectOnderwerp("Dakdekker gespecialiseerd in dakkapellen")).toBe("uw dak");
    expect(detectOnderwerp("Badkamer en sanitair vernieuwen")).toBe("uw badkamer");
    expect(detectOnderwerp("Kozijnen en glaszetter")).toBe("uw kozijnen");
  });

  it("geeft null als er geen vakgebied herkend wordt", () => {
    expect(detectOnderwerp("Een willekeurige webshop voor elektronica")).toBeNull();
  });
});

describe("buildTitleSuggestions", () => {
  it("bouwt de standaardtitel met herkend vakgebied", () => {
    const result = buildTitleSuggestions({
      companyName: "Vincent Kok Tuinen",
      onderwerp: "uw tuin",
      heroText: null,
    });
    expect(result.title).toBe("Bereken direct de kosten van uw tuin");
    expect(result.subtitle).toBe("Vraag vrijblijvend een prijsindicatie aan bij Vincent Kok Tuinen");
    expect(result.titleAlternative).toBeNull();
  });

  it("valt terug op generieke titel/subtitel zonder vakgebied of bedrijfsnaam", () => {
    const result = buildTitleSuggestions({ companyName: null, onderwerp: null, heroText: null });
    expect(result.title).toBe("Bereken direct uw prijs");
    expect(result.subtitle).toBe("Vraag vrijblijvend een prijsindicatie aan");
  });

  it("geeft een bruikbare hero-tekst terug als titleAlternative", () => {
    const result = buildTitleSuggestions({
      companyName: "Vincent Kok Tuinen",
      onderwerp: "uw tuin",
      heroText: "Uw droomtuin binnen handbereik",
    });
    expect(result.titleAlternative).toBe("Uw droomtuin binnen handbereik");
  });

  it("verwerpt een te korte, te lange, 'Welkom'-achtige of afgekapte hero-tekst", () => {
    expect(
      buildTitleSuggestions({ companyName: null, onderwerp: null, heroText: "Kort" }).titleAlternative
    ).toBeNull();
    expect(
      buildTitleSuggestions({
        companyName: null,
        onderwerp: null,
        heroText: "Welkom op de website van ons prachtige bedrijf",
      }).titleAlternative
    ).toBeNull();
    expect(
      buildTitleSuggestions({
        companyName: null,
        onderwerp: null,
        heroText: "Dit is een veel te lange hero-tekst die duidelijk ver boven de zestig tekens grens uitkomt",
      }).titleAlternative
    ).toBeNull();
    expect(
      buildTitleSuggestions({ companyName: null, onderwerp: null, heroText: "Een tekst die afbreekt..." })
        .titleAlternative
    ).toBeNull();
  });

  it("verwerpt hero-tekst die de bedrijfsnaam herhaalt", () => {
    const result = buildTitleSuggestions({
      companyName: "TuinCo",
      onderwerp: null,
      heroText: "Welkom bij TuinCo, uw tuinspecialist",
    });
    expect(result.titleAlternative).toBeNull();
  });

  it("kapt een te lange titel/subtitel af op woordgrens", () => {
    const result = buildTitleSuggestions({
      companyName: "Een Heel Erg Lange Bedrijfsnaam Die De Limiet Van Honderdtwintig Tekens Ruim Overschrijdt Voor Deze Test",
      onderwerp: "uw tuin",
      heroText: null,
    });
    expect(result.subtitle.length).toBeLessThanOrEqual(120);
  });
});
