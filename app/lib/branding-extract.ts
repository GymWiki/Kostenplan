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
  isAcceptedLogoContentType,
  validateLogoImage,
  normalizeContentType,
  pickSecondaryColor,
  cleanCompanyName,
  detectOnderwerp,
  buildTitleSuggestions,
  type CssRule,
} from "@/app/lib/branding-extract-utils";
import type { Lettertype } from "@/app/generated/prisma/client";

export type ExtractSource = "theme-color" | "logo" | "css" | "fallback";
export type Confidence = "high" | "medium" | "low";

export type ExtractResult =
  | {
      success: true;
      primaryColor: string;
      secondaryColor?: string;
      textOnPrimary: string;
      fontFamily: string | null;
      lettertype: Lettertype;
      logoUrl: string | null;
      companyName: string | null;
      title: string;
      titleAlternative?: string;
      subtitle: string;
      source: ExtractSource;
      confidence: Confidence;
    }
  | { success: false; error: string; confidence: "low" };

// ---------------------------------------------------------------------------
// SSRF-preventie: elke fetch (hoofdpagina, stylesheets, logo-kandidaten) gaat
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
// intern adres kunnen redirecten zonder dat wij dat zien. Gebruikt voor
// zowel de hoofdpagina/stylesheets als elke logo-kandidaat hieronder.
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
// JSON-LD structured data (Organization / LocalBusiness)
// ---------------------------------------------------------------------------

function parseJsonLdBlocks($: CheerioAPI): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      const graph = (parsed as { "@graph"?: unknown } | null)?.["@graph"];
      if (Array.isArray(graph)) {
        for (const entry of graph) if (entry && typeof entry === "object") blocks.push(entry as Record<string, unknown>);
      } else if (Array.isArray(parsed)) {
        for (const entry of parsed) if (entry && typeof entry === "object") blocks.push(entry as Record<string, unknown>);
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Ongeldige JSON-LD negeren — mag de rest van de extractie niet blokkeren.
    }
    return undefined;
  });
  return blocks;
}

function findJsonLdByType(
  blocks: Record<string, unknown>[],
  types: string[]
): Record<string, unknown> | null {
  for (const block of blocks) {
    const t = block["@type"];
    const typeList = Array.isArray(t) ? t : [t];
    if (typeList.some((x) => typeof x === "string" && types.includes(x))) return block;
  }
  return null;
}

function extractJsonLdLogoUrl(orgBlock: Record<string, unknown> | null): string | null {
  const logo = orgBlock?.["logo"];
  if (typeof logo === "string") return logo;
  if (logo && typeof logo === "object") {
    const url = (logo as Record<string, unknown>)["url"];
    if (typeof url === "string") return url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logo-kandidaten, in de voorgeschreven volgorde
// ---------------------------------------------------------------------------

function resolveUrl(maybeRelative: string, base: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

// 1. header/nav <img> met "logo" in class/id/src/alt — SVG-bronnen eerst
//    (schalen perfect). 2. JSON-LD Organization/LocalBusiness logo. 3.
//    apple-touch-icon. 4. og:image, pas als laatste redmiddel: dat is op
//    veel sites gewoon een hero-/contentfoto, geen logo — vandaar dat elke
//    kandidaat hieronder nog los gevalideerd wordt (zie validateLogoImage)
//    voordat 'm daadwerkelijk gebruikt wordt.
function findLogoCandidates(
  $: CheerioAPI,
  baseUrl: string,
  jsonLdBlocks: Record<string, unknown>[]
): string[] {
  const candidates: string[] = [];

  const headerNavImgs: { src: string; isSvg: boolean }[] = [];
  $("header img, nav img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src");
    if (!src) return undefined;
    const cls = ($el.attr("class") ?? "").toLowerCase();
    const id = ($el.attr("id") ?? "").toLowerCase();
    const alt = ($el.attr("alt") ?? "").toLowerCase();
    const looksLikeLogo =
      cls.includes("logo") || id.includes("logo") || alt.includes("logo") || src.toLowerCase().includes("logo");
    if (looksLikeLogo) headerNavImgs.push({ src, isSvg: src.toLowerCase().includes(".svg") });
    return undefined;
  });
  headerNavImgs.sort((a, b) => Number(b.isSvg) - Number(a.isSvg));
  for (const { src } of headerNavImgs) {
    const resolved = resolveUrl(src, baseUrl);
    if (resolved) candidates.push(resolved);
  }

  const orgBlock = findJsonLdByType(jsonLdBlocks, ["Organization", "LocalBusiness"]);
  const jsonLdLogo = extractJsonLdLogoUrl(orgBlock);
  if (jsonLdLogo) {
    const resolved = resolveUrl(jsonLdLogo, baseUrl);
    if (resolved) candidates.push(resolved);
  }

  const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href");
  if (appleTouchIcon) {
    const resolved = resolveUrl(appleTouchIcon, baseUrl);
    if (resolved) candidates.push(resolved);
  }

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    const resolved = resolveUrl(ogImage, baseUrl);
    if (resolved) candidates.push(resolved);
  }

  return candidates;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

async function uploadLogoToStorage(
  companyId: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const ext = EXTENSION_BY_CONTENT_TYPE[contentType];
  if (!ext) return null;
  // File is een Node-builtin sinds Node 20 — geen extra dependency nodig om
  // de gedownloade Buffer in hetzelfde formaat aan te bieden als de
  // handmatige PhotoInput-upload (die een File uit FormData krijgt).
  const file = new File([new Uint8Array(buffer)], `logo.${ext}`, { type: contentType });
  // Dynamische import i.p.v. een top-level import: storage.ts gebruikt
  // "server-only" (alleen bruikbaar binnen Next's eigen build). Zo blijft
  // een falende module-load hier een awaited/catchbare promise — resolveLogo()
  // hieronder vangt 'm dan gewoon op als "deze kandidaat mislukt, volgende
  // proberen" i.p.v. dat het hele bestand (en daarmee elke aanroeper, incl.
  // het standalone testscript) meteen crasht bij het laden.
  const { uploadFoto } = await import("@/app/lib/storage");
  const result = await uploadFoto(companyId, file);
  return result.url ?? null;
}

type LogoResult = { url: string; buffer: Buffer } | null;

// Probeert de kandidaten op volgorde; stopt bij de eerste die door de
// validatie komt én succesvol geüpload wordt. Hotlinkt bewust nooit naar de
// site van de vakman zelf (kan verdwijnen/blokkeren) — vandaar de upload
// naar onze eigen Supabase Storage, dezelfde bucket/structuur als de
// handmatige logo-upload (zie app/lib/storage.ts).
async function resolveLogo(candidates: string[], companyId: string): Promise<LogoResult> {
  for (const candidateUrl of candidates) {
    try {
      const image = await safeFetch(candidateUrl, MAX_LOGO_BYTES, "image/*");
      const contentType = normalizeContentType(image.contentType);
      if (!isAcceptedLogoContentType(contentType)) continue;

      const validation = validateLogoImage(image.buffer, contentType);
      if (!validation.ok) continue;

      const uploadedUrl = await uploadLogoToStorage(companyId, image.buffer, contentType);
      if (!uploadedUrl) continue;

      return { url: uploadedUrl, buffer: image.buffer };
    } catch {
      continue; // deze kandidaat mislukt -> volgende proberen, geen harde fout
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Font-herkenning
// ---------------------------------------------------------------------------

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
// Node-vibrant kleurextractie uit het gevalideerde logo
// ---------------------------------------------------------------------------

// Sorteert op HSL-saturatie (niet op populatie — dat zou vaak de
// achtergrondkleur van het logo opleveren) en filtert grijstinten weg.
// Geeft de kleuren terug van meest naar minst verzadigd, zodat de
// aanroeper element [0] als primary en [1] als secondary kan gebruiken.
async function paletteFromLogoBuffer(buffer: Buffer): Promise<string[]> {
  try {
    const palette = await Vibrant.from(buffer).getPalette();
    return Object.values(palette)
      .filter((swatch): swatch is NonNullable<typeof swatch> => swatch != null)
      .map((swatch) => ({ hex: swatch.hex.toLowerCase(), hsl: hexToHsl(swatch.hex) }))
      .filter((s): s is { hex: string; hsl: Hsl } => s.hsl !== null && !isGrayscale(s.hex))
      .sort((a, b) => b.hsl.s - a.hsl.s)
      .map((s) => s.hex);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Orchestratie
// ---------------------------------------------------------------------------

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_STYLESHEETS = 3;

function finalizeColors(
  primaryRaw: string,
  secondaryCandidate: string | null
): { primaryColor: string; secondaryColor: string | null; textOnPrimary: string } {
  const darkened = darkenUntilContrast(primaryRaw);
  const primaryColor = darkened?.hex ?? primaryRaw;
  // Zelfs na het maximale aantal donkerder-stappen niet genoeg contrast?
  // Dan is witte tekst hier gewoon geen goed idee — donkere tekst adviseren
  // i.p.v. een kleur te forceren die intern niet als "primaireKleur met
  // witte tekst" bestaat (zie branding-form.tsx: die combinatie ligt vast).
  const textOnPrimary = darkened ? "#ffffff" : "#111827";

  const secondaryColor = secondaryCandidate && colorsAreDistinct(primaryColor, secondaryCandidate)
    ? secondaryCandidate
    : null;

  return { primaryColor, secondaryColor, textOnPrimary };
}

export async function extractBranding(inputUrl: string, companyId: string): Promise<ExtractResult> {
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
  const jsonLdBlocks = parseJsonLdBlocks($);
  const orgBlock = findJsonLdByType(jsonLdBlocks, ["Organization", "LocalBusiness"]);

  // --- Bedrijfsnaam: JSON-LD name -> og:site_name -> <title> (opgeschoond) ---
  const jsonLdName = typeof orgBlock?.["name"] === "string" ? (orgBlock["name"] as string).trim() : "";
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim() ?? "";
  const pageTitle = $("title").first().text().trim();
  const companyName =
    jsonLdName || ogSiteName || (pageTitle ? cleanCompanyName(pageTitle) : "") || null;

  // --- Tekst verzamelen voor vakgebied-detectie + titleAlternative ---
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const heroHeading = $("h1").first().text().trim() || $("h2").first().text().trim();
  const combinedTextForVakgebied = [pageTitle, metaDescription, heroHeading, ogDescription]
    .filter(Boolean)
    .join(" ");
  const onderwerp = detectOnderwerp(combinedTextForVakgebied);
  const { title, titleAlternative, subtitle } = buildTitleSuggestions({
    companyName,
    onderwerp,
    heroText: heroHeading || null,
  });

  // --- Logo: kandidaten proberen, eerste geldige uploaden naar onze eigen Storage ---
  const logoCandidates = findLogoCandidates($, finalUrl, jsonLdBlocks);
  const logo = await resolveLogo(logoCandidates, companyId);
  const logoPalette = logo ? await paletteFromLogoBuffer(logo.buffer) : [];

  // --- CSS-analyse (gelinkte stylesheets, zelfde host of bekende
  // site-builder-CDN's, plus inline <style>) — altijd berekend, want dit is
  // zowel de primary-fallback als de secondary-bron als er geen (bruikbaar)
  // logo is. ---
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
  const cssWeighted = topColors(collectWeightedColors(cssRules), 2);

  // --- Primaire kleur: theme-color -> logo-palet -> CSS -> falen ---
  const themeColorRaw = $('meta[name="theme-color"]').attr("content");
  const themeColorHex = themeColorRaw ? cssColorToHex(themeColorRaw) : null;

  let primaryRaw: string | null = null;
  let source: ExtractSource = "fallback";
  let confidence: Confidence = "low";
  let secondaryCandidate: string | null = null;

  if (themeColorHex && !isGrayscale(themeColorHex)) {
    primaryRaw = themeColorHex;
    source = "theme-color";
    confidence = "high";
    secondaryCandidate = logoPalette[0] ?? cssWeighted[0] ?? null;
  } else if (logoPalette.length > 0) {
    primaryRaw = logoPalette[0];
    source = "logo";
    confidence = "high";
    secondaryCandidate = logoPalette[1] ?? cssWeighted[0] ?? null;
  } else if (cssWeighted.length > 0) {
    primaryRaw = cssWeighted[0];
    source = "css";
    confidence = "medium";
    secondaryCandidate = cssWeighted[1] ?? null;
  }

  if (!primaryRaw) {
    return {
      success: false,
      error:
        "We konden geen duidelijke huisstijl vinden op deze website. Kies je kleuren hieronder handmatig.",
      confidence: "low",
    };
  }

  const { primaryColor, secondaryColor, textOnPrimary } = finalizeColors(primaryRaw, secondaryCandidate);
  const validSecondary = pickSecondaryColor(primaryColor, secondaryColor);
  const fontFamily = extractFontFamily($, cssRules);

  return {
    success: true,
    primaryColor,
    ...(validSecondary ? { secondaryColor: validSecondary } : {}),
    textOnPrimary,
    fontFamily,
    lettertype: fontFamily ? mapFontFamilyToLettertype(fontFamily) : "MODERN",
    logoUrl: logo?.url ?? null,
    companyName,
    title,
    ...(titleAlternative ? { titleAlternative } : {}),
    subtitle,
    source,
    confidence,
  };
}
