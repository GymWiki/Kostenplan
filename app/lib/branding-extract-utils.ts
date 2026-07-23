// Pure, side-effect-vrije helpers voor de auto-branding-extractie
// (app/lib/branding-extract.ts) — bewust in een eigen bestand ZONDER
// "server-only": dat marker-package resolvet alleen binnen Next's eigen
// build (via de "react-server"-exportconditie) en breekt vitest, dat die
// conditie niet zet. isPrivateIp() gebruikt wel `node:net`, dus deze module
// kan sowieso nooit in een browserbundel terechtkomen — de bundler breekt
// dan vanzelf (hardere, duidelijkere fout dan een stille runtime-throw).
import { isIP } from "node:net";
import { imageSize } from "image-size";
import { rgbToHex, hslToRgb, isGrayscale, colorsAreDistinct } from "./color";

// ---------------------------------------------------------------------------
// SSRF-preventie: IP-classificatie
// ---------------------------------------------------------------------------

const PRIVATE_IPV4_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10", // carrier-grade NAT
  "127.0.0.0/8",
  "169.254.0.0/16", // link-local, incl. cloud metadata-endpoints
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // gereserveerd
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_RANGES.some((cidr) => inCidr(ip, cidr));
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
  if (["fe8", "fe9", "fea", "feb"].some((p) => lower.startsWith(p))) return true; // fe80::/10
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // onherkenbaar -> blokkeren (fail closed)
}

// ---------------------------------------------------------------------------
// URL-normalisatie
// ---------------------------------------------------------------------------

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  // Alleen als er ECHT geen scheme in zit https:// ervoor plakken — anders
  // zou "ftp://host" of "javascript:alert(1)" hier stiekem verminkt worden
  // tot "https://ftp://host" (dat URL() vervolgens zonder klagen parseert
  // als host "ftp:") in plaats van meteen geweigerd te worden.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Alleen http- en https-URL's zijn toegestaan");
  }
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme); // gooit bij een echt ongeldige URL
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Alleen http- en https-URL's zijn toegestaan");
  }
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// CSS-kleur-parsing en gewogen kleurtelling
// ---------------------------------------------------------------------------

export function cssColorToHex(raw: string): string | null {
  const value = raw.trim();

  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      const [r, g, b] = hex;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return `#${hex.toLowerCase()}`;
  }

  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return rgbToHex({ r: Number(r), g: Number(g), b: Number(b) });
  }

  const hslMatch = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i.exec(value);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    return rgbToHex(hslToRgb({ h: Number(h), s: Number(s), l: Number(l) }));
  }

  return null;
}

export type CssRule = { selector: string; body: string };

// Handgeschreven, bewust simpele CSS-splitser (geen postcss-dependency) —
// hoeft niet spec-compliant te zijn, alleen selector<->declaratie-paren
// correct te scheiden voor de gewogen kleurtelling hieronder. Daalt af in
// @media/@supports-blokken zodat regels daarbinnen niet verloren gaan.
export function splitCssRules(css: string): CssRule[] {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  let selectorBuf = "";
  let i = 0;
  const n = cleaned.length;

  while (i < n) {
    const ch = cleaned[i];
    if (ch === "{") {
      const selector = selectorBuf.trim();
      selectorBuf = "";
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        if (cleaned[j] === "{") depth++;
        else if (cleaned[j] === "}") depth--;
        j++;
      }
      const body = cleaned.slice(i + 1, j - 1);
      if (selector.startsWith("@")) {
        rules.push(...splitCssRules(body));
      } else if (selector) {
        rules.push({ selector, body });
      }
      i = j;
    } else {
      selectorBuf += ch;
      i++;
    }
  }
  return rules;
}

const INTERACTIVE_SELECTOR_RE = /(^|[\s,>+~])(button|\.btn|a|header|\.nav)(?=[\s.:,#\[>+~)]|$)/i;
const COLOR_TOKEN_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

// Telt elke gevonden kleur, ×5 gewogen als de regel een selector heeft die
// duidelijk interactief/prominent is (knoppen, links, header, nav-balk) —
// zo wint de knopkleur van bijv. een incidentele rode foutkleur die maar
// één keer voorkomt.
export function collectWeightedColors(rules: CssRule[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { selector, body } of rules) {
    const weight = INTERACTIVE_SELECTOR_RE.test(selector) ? 5 : 1;
    const matches = body.match(COLOR_TOKEN_RE) ?? [];
    for (const raw of matches) {
      const hex = cssColorToHex(raw);
      if (!hex || isGrayscale(hex)) continue;
      counts.set(hex, (counts.get(hex) ?? 0) + weight);
    }
  }
  return counts;
}

export function topColors(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([hex]) => hex);
}

// ---------------------------------------------------------------------------
// Font-herkenning
// ---------------------------------------------------------------------------

const SYSTEM_FONT_KEYWORDS = [
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica neue",
  "helvetica",
  "arial",
  "sans-serif",
  "serif",
  "monospace",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
];

export function isSystemFont(name: string): boolean {
  const lower = name.toLowerCase();
  return SYSTEM_FONT_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
}

export function extractFontFamilyFromGoogleFontsHref(href: string): string | null {
  const familyMatch = /[?&]family=([^&]+)/.exec(href);
  if (!familyMatch) return null;
  const raw = decodeURIComponent(familyMatch[1]).split("|")[0].split(":")[0];
  const name = raw.replace(/\+/g, " ").trim();
  return name && !isSystemFont(name) ? name : null;
}

export function extractFontFamilyFromCss(cssRules: CssRule[]): string | null {
  for (const { selector, body } of cssRules) {
    if (!/(^|[\s,])body(?=[\s{:,.#\[]|$)/i.test(selector)) continue;
    const match = /font-family\s*:\s*([^;]+);?/i.exec(body);
    if (match) {
      const first = match[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (first && !isSystemFont(first)) return first;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logo-validatie: content-type + afmetingen
// ---------------------------------------------------------------------------

const ACCEPTED_LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function normalizeContentType(contentType: string | null): string {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

export function isAcceptedLogoContentType(contentType: string | null): boolean {
  return ACCEPTED_LOGO_CONTENT_TYPES.includes(normalizeContentType(contentType));
}

// Rasterafbeeldingen: minimaal 64px kortste zijde (favicons als 16x16/32x32
// vallen daarmee automatisch af), aspect ratio tussen 1:4 en 4:1, en een
// aparte afwijzing voor "breed en ~16:9" — dat patroon is zo goed als altijd
// een hero-/contentfoto, geen logo (zie ook findScopedLogoUrl-commentaar in
// branding-extract.ts: og:image is vaak zo'n foto). SVG slaat deze check
// helemaal over — die schaalt perfect, dus afmetingen zeggen niets.
export function validateLogoImage(
  buffer: Buffer,
  contentType: string | null
): { ok: true } | { ok: false; reason: string } {
  const normalized = normalizeContentType(contentType);
  if (!ACCEPTED_LOGO_CONTENT_TYPES.includes(normalized)) {
    return { ok: false, reason: "Bestandstype wordt niet ondersteund als logo" };
  }
  if (normalized === "image/svg+xml") {
    return { ok: true };
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(buffer);
  } catch {
    return { ok: false, reason: "Kon de afbeelding niet lezen" };
  }
  const { width, height } = dimensions;
  if (!width || !height) {
    return { ok: false, reason: "Kon de afmetingen van de afbeelding niet bepalen" };
  }

  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  if (shortest < 64) {
    return { ok: false, reason: "Afbeelding is te klein (waarschijnlijk een favicon)" };
  }

  const ratio = longest / shortest;
  if (ratio > 4) {
    return { ok: false, reason: "Afbeelding is te langgerekt voor een logo" };
  }

  const looksLikeHeroPhoto = width > 1200 && ratio >= 1.6 && ratio <= 1.95;
  if (looksLikeHeroPhoto) {
    return { ok: false, reason: "Lijkt een hero-foto (breed, ~16:9), geen logo" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Secundaire kleur — zelfde grijstint-/onderscheid-eisen als de primaire,
// plus een expliciete check tegen de achtergrondkleur (een lichte
// site-achtergrond mag nooit als "merkkleur" worden voorgesteld).
// ---------------------------------------------------------------------------

export function pickSecondaryColor(
  primaryColor: string,
  candidate: string | null,
  backgroundColor?: string | null
): string | null {
  if (!candidate) return null;
  if (isGrayscale(candidate)) return null;
  if (!colorsAreDistinct(primaryColor, candidate)) return null;
  if (backgroundColor && !colorsAreDistinct(backgroundColor, candidate)) return null;
  return candidate;
}

// ---------------------------------------------------------------------------
// Bedrijfsnaam opschonen
// ---------------------------------------------------------------------------

// Alleen splitsen op scheidingstekens die CMS-thema's echt als
// titel-separator gebruiken (|, – , —) — NIET op een kale "-", want die komt
// legitiem voor in bedrijfsnamen zelf (bijv. "Jansen-de Boer Tuinen").
const TITLE_SEPARATOR_RE = /\s*[|–—]\s*/;
const GENERIC_TITLE_SEGMENTS = new Set([
  "home",
  "homepage",
  "welkom",
  "start",
  "startpagina",
  "officiele website",
  "officiële website",
]);

export function cleanCompanyName(rawTitle: string): string {
  const trimmed = rawTitle.trim();
  if (!trimmed) return trimmed;

  const segments = trimmed
    .split(TITLE_SEPARATOR_RE)
    .map((s) => s.trim())
    .filter(Boolean);

  const meaningful = segments.filter((seg) => !GENERIC_TITLE_SEGMENTS.has(seg.toLowerCase()));
  const chosen = (meaningful.length > 0 ? meaningful : segments)[0] ?? trimmed;

  return chosen.replace(/^welkom bij\s+/i, "").trim();
}

// ---------------------------------------------------------------------------
// Tekstopmaak: hoofdletter-nette zin, geen ALL CAPS, afkappen op woordgrens
// ---------------------------------------------------------------------------

export function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  // "Roept" de site in hoofdletters? Dan eerst naar leesbare zin-case,
  // anders blijft de bestaande (meestal al nette) casing gewoon staan.
  const isShouting = letters.length > 3 && letters === letters.toUpperCase();
  const base = isShouting ? trimmed.toLowerCase() : trimmed;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function truncateAtWordBoundary(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const sliced = trimmed.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
}

// ---------------------------------------------------------------------------
// Vakgebied-detectie — dekt de vier bestaande DOELGROEPEN (app/lib/
// doelgroepen.ts: hoveniers, stratenmakers, schilders, klusbedrijven) plus
// de extra vakgebieden die de opdracht noemt. Eerste match wint; de lijsten
// zijn bewust vrij van overlappende woorden.
// ---------------------------------------------------------------------------

export const VAKGEBIED_KEYWORDS: { keywords: string[]; onderwerp: string }[] = [
  {
    keywords: ["tuin", "hovenier", "beplanting", "groenvoorziening", "tuinaanleg", "tuinontwerp"],
    onderwerp: "uw tuin",
  },
  {
    keywords: ["bestrating", "straatwerk", "oprit", "klinkers", "stratenmaker"],
    onderwerp: "uw bestrating",
  },
  { keywords: ["schilder", "schilderwerk", "sauswerk"], onderwerp: "uw schilderwerk" },
  { keywords: ["dak", "dakkapel", "dakbedekking", "dakwerk", "dakdekker"], onderwerp: "uw dak" },
  { keywords: ["badkamer", "sanitair"], onderwerp: "uw badkamer" },
  { keywords: ["kozijn", "kozijnen", "glaszetter"], onderwerp: "uw kozijnen" },
  { keywords: ["klus", "klussen", "klusbedrijf", "verbouwing", "verbouwen"], onderwerp: "uw klus" },
];

export function detectOnderwerp(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { keywords, onderwerp } of VAKGEBIED_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return onderwerp;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Titel/subtitel-templates (stap B van de opdracht) — puur regelgebaseerd,
// geen externe API's.
// ---------------------------------------------------------------------------

const MIN_HERO_LEN = 20;
const MAX_HERO_LEN = 60;
const TITLE_MAX_LEN = 60;
const SUBTITLE_MAX_LEN = 120;

export function buildTitleSuggestions({
  companyName,
  onderwerp,
  heroText,
}: {
  companyName: string | null;
  onderwerp: string | null;
  heroText: string | null;
}): { title: string; titleAlternative: string | null; subtitle: string } {
  const titleBase = onderwerp ? `Bereken direct de kosten van ${onderwerp}` : "Bereken direct uw prijs";
  const title = truncateAtWordBoundary(capitalizeSentence(titleBase), TITLE_MAX_LEN);

  let titleAlternative: string | null = null;
  if (heroText) {
    const trimmed = heroText.trim();
    const looksLikeWelcome = /^welkom\b/i.test(trimmed);
    const duplicatesCompanyName = companyName
      ? trimmed.toLowerCase().includes(companyName.toLowerCase())
      : false;
    const endsWithEllipsis = /(\.{3}|…)$/.test(trimmed);
    if (
      trimmed.length >= MIN_HERO_LEN &&
      trimmed.length <= MAX_HERO_LEN &&
      !looksLikeWelcome &&
      !duplicatesCompanyName &&
      !endsWithEllipsis
    ) {
      titleAlternative = truncateAtWordBoundary(capitalizeSentence(trimmed), TITLE_MAX_LEN);
    }
  }

  const subtitleBase = companyName
    ? `Vraag vrijblijvend een prijsindicatie aan bij ${companyName}`
    : "Vraag vrijblijvend een prijsindicatie aan";
  const subtitle = truncateAtWordBoundary(capitalizeSentence(subtitleBase), SUBTITLE_MAX_LEN);

  return { title, titleAlternative, subtitle };
}
