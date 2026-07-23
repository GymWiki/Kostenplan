// Bewust GEEN "import 'server-only'" hier: dat marker-package resolvet
// alleen binnen Next's eigen build (via de "react-server"-exportconditie)
// en breekt zowel vitest als het standalone testscript
// (scripts/test-branding-extract.ts). Niet nodig voor de bescherming zelf:
// dit bestand gebruikt `node:dns`/`node:net`, echte Node-builtins zonder
// browser-shim — een per ongeluk client-side import breekt dan sowieso al
// hard op de build, met dezelfde bescherming als de marker zou geven.
import dns from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { Vibrant } from "node-vibrant/node";
import { hexToHsl, isGrayscale, darkenUntilContrast, colorsAreDistinct, type Hsl } from "@/app/lib/color";
import { mapFontFamilyToLettertype } from "@/app/lib/font-mapping";
import {
  isPrivateIp,
  normalizeUrl,
  splitCssRules,
  collectWeightedColors,
  topColors,
  extractFontFamilyFromGoogleFontsHref,
  extractFontFamilyFromCss,
  cssColorToHex,
  type CssRule,
} from "@/app/lib/branding-extract-utils";
import type { Lettertype } from "@/app/generated/prisma/client";

export type ExtractSource = "theme-color" | "logo" | "css" | "fallback";
export type Confidence = "high" | "medium" | "low";

export type ExtractResult =
  | {
      success: true;
      primaryColor: string;
      accentColor: string | null;
      textOnPrimary: string;
      fontFamily: string | null;
      lettertype: Lettertype;
      logoUrl: string | null;
      source: ExtractSource;
      confidence: Confidence;
    }
  | { success: false; error: string; confidence: "low" };

// ---------------------------------------------------------------------------
// SSRF-preventie: elke fetch (hoofdpagina, stylesheets, logo-afbeelding) gaat
// hier doorheen. Blokkeert private/interne IP-ranges, ook na het volgen van
// een redirect — een aanvaller kan anders een publieke URL laten
// doorverwijzen naar 127.0.0.1 of een cloud-metadata-endpoint (169.254...).
// De classificatie zelf (isPrivateIp) staat in branding-extract-utils.ts
// zodat die zonder "server-only" apart unit-test-baar is.
// ---------------------------------------------------------------------------

async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname.toLowerCase() === "localhost") {
    throw new Error("Interne hostnamen zijn niet toegestaan");
  }
  const direct = isIP(hostname);
  if (direct) {
    if (isPrivateIp(hostname)) throw new Error("Interne IP-adressen zijn niet toegestaan");
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error("Kon het domein niet resolven");
  }
  if (addresses.length === 0) throw new Error("Kon het domein niet resolven");
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error("Dit domein wijst naar een intern IP-adres");
    }
  }
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Volgt redirects handmatig (redirect: "manual") i.p.v. fetch dit automatisch
// te laten doen, zodat elke tussenliggende hop opnieuw langs
// assertPublicHost() gaat — anders zou een publieke URL alsnog naar een
// intern adres kunnen redirecten zonder dat wij dat zien.
async function safeFetch(
  startUrl: string,
  maxBytes: number,
  accept: string
): Promise<{ finalUrl: string; buffer: Buffer; contentType: string | null }> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Alleen http- en https-URL's zijn toegestaan");
    }
    await assertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": BROWSER_USER_AGENT, Accept: accept },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Time-out bij het ophalen van de website");
      }
      throw new Error("Kon de website niet bereiken");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect zonder bestemming");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Website gaf status ${response.status} terug`);
    }

    const reader = response.body?.getReader();
    if (!reader) return { finalUrl: currentUrl, buffer: Buffer.alloc(0), contentType: null };

    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error("Response van de website is te groot");
      }
      chunks.push(value);
    }
    return {
      finalUrl: currentUrl,
      buffer: Buffer.concat(chunks),
      contentType: response.headers.get("content-type"),
    };
  }
  throw new Error("Te veel redirects");
}

// ---------------------------------------------------------------------------
// Logo- en font-detectie uit de HTML
// ---------------------------------------------------------------------------

function resolveUrl(maybeRelative: string, base: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

// Voor de logoUrl die we tónen (preview): og:image eerst, want dat is de
// door de site zelf gekozen representatieve afbeelding, met header/nav/
// class="logo" als fallback.
function findDisplayLogoUrl($: CheerioAPI, baseUrl: string): string | null {
  const og = $('meta[property="og:image"]').attr("content");
  if (og) {
    const resolved = resolveUrl(og, baseUrl);
    if (resolved) return resolved;
  }
  return findScopedLogoUrl($, baseUrl);
}

// Voor kleur-extractie via node-vibrant gebruiken we bewust NIET og:image —
// dat is op veel sites gewoon een hero-/contentfoto (bijv. een tuinfoto),
// geen logo, en zou dan een willekeurige fotokleur als "merkkleur"
// opleveren. Alleen afbeeldingen die overduidelijk een logo zíjn (in
// header/nav, of met "logo" in class/alt) worden voor kleuranalyse gebruikt.
function findScopedLogoUrl($: CheerioAPI, baseUrl: string): string | null {
  let found: string | null = null;
  $("header img, nav img, img").each((_, el) => {
    const $el = $(el);
    const cls = ($el.attr("class") ?? "").toLowerCase();
    const alt = ($el.attr("alt") ?? "").toLowerCase();
    const scoped = $el.closest("header, nav").length > 0;
    if (scoped || cls.includes("logo") || alt.includes("logo")) {
      const src = $el.attr("src");
      if (src) {
        found = resolveUrl(src, baseUrl);
        return false; // stop bij de eerste match
      }
    }
    return undefined;
  });
  return found;
}

function extractFontFamily($: CheerioAPI, cssRules: CssRule[]): string | null {
  let googleFontHref: string | undefined;
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    if (googleFontHref) return false;
    googleFontHref = $(el).attr("href");
    return undefined;
  });
  if (googleFontHref) {
    const fromGoogle = extractFontFamilyFromGoogleFontsHref(googleFontHref);
    if (fromGoogle) return fromGoogle;
  }
  return extractFontFamilyFromCss(cssRules);
}

// ---------------------------------------------------------------------------
// Node-vibrant kleurextractie uit een gedownloade logo-afbeelding
// ---------------------------------------------------------------------------

async function extractFromLogoBuffer(
  buffer: Buffer
): Promise<{ primary: string; accent: string | null } | null> {
  try {
    const palette = await Vibrant.from(buffer).getPalette();
    const withHex = Object.values(palette)
      .filter((swatch): swatch is NonNullable<typeof swatch> => swatch != null)
      .map((swatch) => ({ hex: swatch.hex.toLowerCase(), hsl: hexToHsl(swatch.hex) }))
      .filter((s): s is { hex: string; hsl: Hsl } => s.hsl !== null && !isGrayscale(s.hex))
      // "Pak de meest verzadigde kleur" — sorteren op HSL-saturatie, niet op
      // populatie (dat zou vaak de achtergrondkleur van het logo opleveren).
      .sort((a, b) => b.hsl.s - a.hsl.s);

    if (withHex.length === 0) return null;
    return { primary: withHex[0].hex, accent: withHex[1]?.hex ?? null };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Orchestratie
// ---------------------------------------------------------------------------

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_BYTES = 1 * 1024 * 1024;
const MAX_STYLESHEETS = 3;

function finalizeColors(
  primaryRaw: string,
  accentRaw: string | null
): { primaryColor: string; accentColor: string | null; textOnPrimary: string } {
  const darkened = darkenUntilContrast(primaryRaw);
  const primaryColor = darkened?.hex ?? primaryRaw;
  // Zelfs na het maximale aantal donkerder-stappen niet genoeg contrast?
  // Dan is witte tekst hier gewoon geen goed idee — donkere tekst adviseren
  // i.p.v. een kleur te forceren die intern niet als "primaireKleur met
  // witte tekst" bestaat (zie branding-form.tsx: die combinatie ligt vast).
  const textOnPrimary = darkened ? "#ffffff" : "#111827";

  const accentColor = accentRaw && colorsAreDistinct(primaryColor, accentRaw) ? accentRaw : null;

  return { primaryColor, accentColor, textOnPrimary };
}

export async function extractBranding(inputUrl: string): Promise<ExtractResult> {
  let startUrl: string;
  try {
    startUrl = normalizeUrl(inputUrl);
  } catch {
    return { success: false, error: "Vul een geldige website-URL in.", confidence: "low" };
  }

  let html: string;
  let finalUrl: string;
  try {
    const page = await safeFetch(startUrl, MAX_HTML_BYTES, "text/html,application/xhtml+xml");
    html = page.buffer.toString("utf8");
    finalUrl = page.finalUrl;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Kon de website niet ophalen.",
      confidence: "low",
    };
  }

  const $ = cheerio.load(html);
  const displayLogoUrl = findDisplayLogoUrl($, finalUrl);

  // Stap 1: <meta name="theme-color">
  const themeColorRaw = $('meta[name="theme-color"]').attr("content");
  if (themeColorRaw) {
    const hex = cssColorToHex(themeColorRaw);
    if (hex && !isGrayscale(hex)) {
      const { primaryColor, accentColor, textOnPrimary } = finalizeColors(hex, null);
      const fontFamily = extractFontFamily($, []);
      return {
        success: true,
        primaryColor,
        accentColor,
        textOnPrimary,
        fontFamily,
        lettertype: fontFamily ? mapFontFamilyToLettertype(fontFamily) : "MODERN",
        logoUrl: displayLogoUrl,
        source: "theme-color",
        confidence: "high",
      };
    }
  }

  // Stap 2: kleuren uit het logo (alleen een afbeelding die overduidelijk
  // een logo is — zie findScopedLogoUrl — nooit een willekeurige og:image
  // contentfoto).
  const logoForColor = findScopedLogoUrl($, finalUrl);
  if (logoForColor) {
    try {
      const logoImage = await safeFetch(logoForColor, MAX_LOGO_BYTES, "image/*");
      const fromLogo = await extractFromLogoBuffer(logoImage.buffer);
      if (fromLogo) {
        const { primaryColor, accentColor, textOnPrimary } = finalizeColors(
          fromLogo.primary,
          fromLogo.accent
        );
        const fontFamily = extractFontFamily($, []);
        return {
          success: true,
          primaryColor,
          accentColor,
          textOnPrimary,
          fontFamily,
          lettertype: fontFamily ? mapFontFamilyToLettertype(fontFamily) : "MODERN",
          logoUrl: displayLogoUrl ?? logoForColor,
          source: "logo",
          confidence: "high",
        };
      }
    } catch {
      // Logo kon niet opgehaald/geanalyseerd worden — gewoon doorvallen naar
      // de CSS-analyse hieronder, geen harde fout.
    }
  }

  // Stap 3: CSS-analyse (gelinkte stylesheets, zelfde host of bekende
  // site-builder-CDN's, plus inline <style>).
  const host = new URL(finalUrl).hostname;
  const knownCdnSuffixes = ["wixstatic.com", "squarespace.com", "jouwweb.nl"];
  const stylesheetUrls: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    if (stylesheetUrls.length >= MAX_STYLESHEETS) return false;
    const href = $(el).attr("href");
    if (!href) return undefined;
    const resolved = resolveUrl(href, finalUrl);
    if (!resolved) return undefined;
    const resolvedHost = new URL(resolved).hostname;
    const sameSite = resolvedHost === host || resolvedHost.endsWith(`.${host}`);
    const knownCdn = knownCdnSuffixes.some((suffix) => resolvedHost.endsWith(suffix));
    if (sameSite || knownCdn) stylesheetUrls.push(resolved);
    return undefined;
  });

  let cssText = $("style").text();
  for (const url of stylesheetUrls) {
    try {
      const sheet = await safeFetch(url, MAX_HTML_BYTES, "text/css,*/*");
      cssText += `\n${sheet.buffer.toString("utf8")}`;
    } catch {
      // Eén onbereikbare stylesheet mag de rest van de analyse niet blokkeren.
    }
  }

  const cssRules = splitCssRules(cssText);
  const weighted = collectWeightedColors(cssRules);
  const [primaryRaw, accentRaw] = topColors(weighted, 2);

  if (primaryRaw) {
    const { primaryColor, accentColor, textOnPrimary } = finalizeColors(primaryRaw, accentRaw ?? null);
    const fontFamily = extractFontFamily($, cssRules);
    return {
      success: true,
      primaryColor,
      accentColor,
      textOnPrimary,
      fontFamily,
      lettertype: fontFamily ? mapFontFamilyToLettertype(fontFamily) : "MODERN",
      logoUrl: displayLogoUrl,
      source: "css",
      confidence: "medium",
    };
  }

  // Stap 4: niets bruikbaars gevonden.
  return {
    success: false,
    error:
      "We konden geen duidelijke huisstijl vinden op deze website. Kies je kleuren hieronder handmatig.",
    confidence: "low",
  };
}
