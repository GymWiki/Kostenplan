import { createHash } from "node:crypto";

// Hulpfuncties voor de probeer-flow (rekentool maken zonder account).
export const GAST_BEWAAR_DAGEN = 7;
export const GAST_BEDRIJFSNAAM = "Mijn hoveniersbedrijf";
export const GAST_TOOLNAAM = "Mijn rekentool";

// Maakt van wat iemand intikt (of in ?site= staat) een veilige https-URL, of
// null. Alleen http(s) op de standaardpoort, een echte domeinnaam (met punt),
// geen IP-adressen, localhost of interne namen. De extractie zelf controleert
// bij het ophalen nogmaals (ook na redirects) — dit is de eerste, goedkope poort.
export function normaliseerSite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tekst = raw.trim();
  if (tekst === "" || tekst.length > 200 || /\s/.test(tekst)) return null;
  const heeftScheme = /^[a-z][a-z0-9+.-]*:/i.test(tekst) && !/^[^/]*:\d+(\/|$)/.test(tekst);
  if (heeftScheme && !/^https?:\/\//i.test(tekst)) return null;
  let url: URL;
  try {
    url = new URL(heeftScheme ? tekst : `https://${tekst}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null; // IP-adressen
  if (!/^[a-z0-9.-]+$/.test(host) && !host.startsWith("xn--") && !/[^\x00-\x7f]/.test(host)) return null;
  return `https://${host}`;
}

// IP uit de proxy-headers (Vercel zet x-forwarded-for) → eenrichtings-hash,
// zodat we nooit een IP-adres opslaan.
export function ipHash(headers: { get(naam: string): string | null }): string {
  const ip = (headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "onbekend").split(",")[0].trim();
  return createHash("sha256").update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export function sessieHash(userId: string): string {
  return createHash("sha256").update(`gast:${userId}`).digest("hex").slice(0, 24);
}

export type GastBron = { bron: string; metSite: boolean; utm_source?: string; utm_medium?: string; utm_campaign?: string };

const schoon = (v: unknown) => (typeof v === "string" ? v.replace(/[^\w.\-+ ]/g, "").slice(0, 60) : "");

// utm-parameters + of ?site= gebruikt is → één korte bronnaam voor de funnel.
export function bepaalBron(p: { utm_source?: unknown; utm_medium?: unknown; utm_campaign?: unknown; metSiteParam?: boolean }): GastBron {
  const utm_source = schoon(p.utm_source);
  const utm_medium = schoon(p.utm_medium);
  const utm_campaign = schoon(p.utm_campaign);
  const bron = utm_source ? (utm_campaign ? `${utm_source}/${utm_campaign}` : utm_source) : p.metSiteParam ? "link-met-site" : "direct";
  return { bron, metSite: Boolean(p.metSiteParam), utm_source, utm_medium, utm_campaign };
}

export const GAST_GEBEURTENISSEN = [
  "probeer_bekeken",
  "probeer_gestart",
  "branding_gelukt",
  "branding_mislukt",
  "editor_geopend",
  "prijs_aangepast",
  "uitproberen_gebruikt",
  "account_paneel_geopend",
  "account_gemaakt_google",
  "account_gemaakt_email",
  "link_gemaild",
  "embed_gekopieerd",
] as const;
export type GastGebeurtenisType = (typeof GAST_GEBEURTENISSEN)[number];
