// Adressen opzoeken met de gratis PDOK Locatieserver (geen sleutel, geen kosten): postcode + huisnummer
// naar adres en coördinaten, en autocomplete. Draait in de browser (rekentool, instellingen) en op de
// server (controle bij een aanvraag, opslaan van het vestigingsadres).
//
// Een storing van PDOK blokkeert nooit: de functies geven dan { ok: false } terug en de aanroeper laat de
// klant door met de markering "Werkgebied niet gecontroleerd". Antwoorden worden kort onthouden.

export const PDOK_BASIS = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

export type PdokAdres = {
  weergavenaam: string;
  postcode: string;
  huisnummer: string;
  straat: string;
  plaats: string;
  lat: number;
  lon: number;
};

export type PdokUitslag<T> = { ok: true; waarde: T } | { ok: false; reden: "storing" };

type Doc = {
  weergavenaam?: string;
  centroide_ll?: string;
  postcode?: string;
  huis_nlt?: string;
  huisnummer?: number | string;
  straatnaam?: string;
  woonplaatsnaam?: string;
};

const FL = "weergavenaam,centroide_ll,postcode,huis_nlt,huisnummer,straatnaam,woonplaatsnaam";

export function parseDoc(d: Doc): PdokAdres | null {
  const m = d.centroide_ll?.match(/POINT\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/);
  if (!m || !d.postcode) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    weergavenaam: d.weergavenaam ?? `${d.straatnaam ?? ""} ${d.huis_nlt ?? d.huisnummer ?? ""}, ${d.postcode} ${d.woonplaatsnaam ?? ""}`.trim(),
    postcode: d.postcode,
    huisnummer: String(d.huis_nlt ?? d.huisnummer ?? ""),
    straat: d.straatnaam ?? "",
    plaats: d.woonplaatsnaam ?? "",
    lat,
    lon,
  };
}

// Alleen op de server: PDOK_BASIS_URL wijst naar een eigen testserver (de controle-scripts). In productie niet gezet.
const basisUrl = (opties: { basis?: string }) => opties.basis ?? (typeof process !== "undefined" ? process.env.PDOK_BASIS_URL : undefined) ?? PDOK_BASIS;

type Opties = { fetchFn?: typeof fetch; basis?: string; timeoutMs?: number; ttlMs?: number; nu?: () => number };

const cache = new Map<string, { t: number; waarde: PdokAdres[] }>();
const MAX_CACHE = 300;

export function leegPdokCache() {
  cache.clear();
}

async function haal(url: string, opties: Opties): Promise<PdokUitslag<PdokAdres[]>> {
  const nu = opties.nu ?? Date.now;
  const ttl = opties.ttlMs ?? 10 * 60 * 1000;
  const bewaard = cache.get(url);
  if (bewaard && nu() - bewaard.t < ttl) return { ok: true, waarde: bewaard.waarde };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opties.timeoutMs ?? 4000);
  try {
    const res = await (opties.fetchFn ?? fetch)(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) return { ok: false, reden: "storing" };
    const json = (await res.json()) as { response?: { docs?: Doc[] } };
    const waarde = (json.response?.docs ?? []).map(parseDoc).filter((a): a is PdokAdres => a !== null);
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(url, { t: nu(), waarde });
    return { ok: true, waarde };
  } catch {
    return { ok: false, reden: "storing" };
  } finally {
    clearTimeout(timer);
  }
}

// Autocomplete: tot 5 adressen bij wat de gebruiker typt.
export function zoekAdressen(tekst: string, opties: Opties = {}): Promise<PdokUitslag<PdokAdres[]>> {
  const q = tekst.trim();
  if (q.length < 3) return Promise.resolve({ ok: true, waarde: [] });
  const url = `${basisUrl(opties)}/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=5&fl=${FL}`;
  return haal(url, opties);
}

const normaal = (s: string) => s.toLowerCase().replace(/[\s\-.]/g, "");

// Het adres bij een postcode en huisnummer (met optionele toevoeging). waarde null = bestaat niet.
export async function zoekPostcodeHuisnummer(postcode: string, huisnummer: string, toevoeging: string, opties: Opties = {}): Promise<PdokUitslag<PdokAdres | null>> {
  const pc = postcode.replace(/\s/g, "").toUpperCase();
  const nr = huisnummer.trim();
  if (!/^\d{4}[A-Z]{2}$/.test(pc) || !/^\d{1,5}$/.test(nr)) return { ok: true, waarde: null };
  const q = `${pc} ${nr}${toevoeging ? ` ${toevoeging}` : ""}`;
  const url = `${basisUrl(opties)}/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=10&fl=${FL}`;
  const r = await haal(url, opties);
  if (!r.ok) return r;
  const metPostcode = r.waarde.filter((a) => a.postcode.replace(/\s/g, "").toUpperCase() === pc);
  const gewenst = normaal(`${nr}${toevoeging}`);
  const exact = metPostcode.find((a) => normaal(a.huisnummer) === gewenst);
  const zelfdeNummer = metPostcode.find((a) => String(parseInt(a.huisnummer, 10)) === nr && (toevoeging === "" || normaal(a.huisnummer).startsWith(gewenst)));
  return { ok: true, waarde: exact ?? zelfdeNummer ?? null };
}

// Een punt in een viercijferig postcodegebied (voor de kaart): de eerste volledige postcode die erbij hoort.
export async function zoekPostcodeGebied(vier: number, opties: Opties = {}): Promise<PdokUitslag<PdokAdres | null>> {
  const url = `${basisUrl(opties)}/free?q=${vier}&fq=type:postcode&rows=1&fl=${FL}`;
  const r = await haal(url, opties);
  if (!r.ok) return r;
  return { ok: true, waarde: r.waarde[0] ?? null };
}
