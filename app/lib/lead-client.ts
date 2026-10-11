// Browser-kant van het versturen van een aanvraag: time-out, maximaal drie
// pogingen met oplopende wachttijd, een eventuele reserve-route, en een
// wachtrij in localStorage voor als het (nog) niet lukt. Geen React, geen
// server-code: alles wat de omgeving nodig heeft is injecteerbaar (getest).

export const WACHTRIJ_SLEUTEL = "kp:leads:v1";
const MAX_LEEFTIJD_MS = 30 * 24 * 3600 * 1000;
const MAX_ITEMS = 5;

export type LeadPayload = {
  sleutel: string;
  toolId: string;
  naam: string;
  email: string;
  telefoonnummer: string;
  snapshot: unknown;
};

export type WachtrijItem = LeadPayload & { ts: number };

export type VerstuurUitslag =
  | { soort: "ok"; viaReserve: boolean }
  | { soort: "definitief"; error?: string; fieldErrors?: Record<string, string> }
  | { soort: "later" };

type Opslag = Pick<Storage, "getItem" | "setItem">;

export function maakSleutel(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // val terug
  }
  let s = "";
  for (let i = 0; i < 24; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

function opslagOf(opslag?: Opslag | null): Opslag | null {
  if (opslag) return opslag;
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function leesWachtrij(opslag?: Opslag | null, nu = Date.now()): WachtrijItem[] {
  const o = opslagOf(opslag);
  if (!o) return [];
  try {
    const ruw = o.getItem(WACHTRIJ_SLEUTEL);
    const lijst: unknown = ruw ? JSON.parse(ruw) : [];
    if (!Array.isArray(lijst)) return [];
    return lijst.filter(
      (i): i is WachtrijItem =>
        Boolean(i) && typeof i.sleutel === "string" && typeof i.toolId === "string" && typeof i.ts === "number" && nu - i.ts < MAX_LEEFTIJD_MS
    );
  } catch {
    return [];
  }
}

function schrijfWachtrij(lijst: WachtrijItem[], opslag?: Opslag | null) {
  const o = opslagOf(opslag);
  if (!o) return;
  try {
    o.setItem(WACHTRIJ_SLEUTEL, JSON.stringify(lijst.slice(-MAX_ITEMS)));
  } catch {
    // opslag vol of geblokkeerd: de aanvraag blijft dan alleen in beeld
  }
}

// Zelfde sleutel = dezelfde aanvraag: vervangt de eerdere versie, dus een
// aangepaste tweede poging wordt nooit een tweede lead.
export function voegToeAanWachtrij(payload: LeadPayload, opslag?: Opslag | null, nu = Date.now()) {
  const rest = leesWachtrij(opslag, nu).filter((i) => i.sleutel !== payload.sleutel);
  schrijfWachtrij([...rest, { ...payload, ts: nu }], opslag);
}

export function verwijderUitWachtrij(sleutel: string, opslag?: Opslag | null) {
  schrijfWachtrij(leesWachtrij(opslag).filter((i) => i.sleutel !== sleutel), opslag);
}

export type VerstuurOpties = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  pogingen?: number;
  wachtMs?: number[];
  reserveUrl?: string | null;
  slaap?: (ms: number) => Promise<void>;
  url?: string;
};

type Antwoord = { soort: "ok" } | { soort: "definitief"; error?: string; fieldErrors?: Record<string, string> } | { soort: "fout" };

async function eenPoging(url: string, payload: LeadPayload, fetchFn: typeof fetch, timeoutMs: number): Promise<Antwoord> {
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
      keepalive: false,
    });
    if (res.ok) return { soort: "ok" };
    if (res.status === 400 || res.status === 404 || res.status === 413 || res.status === 422) {
      const json = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string> };
      return { soort: "definitief", error: json.error, fieldErrors: json.fieldErrors };
    }
    return { soort: "fout" };
  } catch {
    return { soort: "fout" };
  }
}

export async function verstuurMetHerhaling(payload: LeadPayload, o: VerstuurOpties = {}): Promise<VerstuurUitslag> {
  const fetchFn = o.fetchFn ?? fetch;
  const timeoutMs = o.timeoutMs ?? 8000;
  const pogingen = o.pogingen ?? 3;
  const wacht = o.wachtMs ?? [1000, 3000];
  const slaap = o.slaap ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const url = o.url ?? "/api/embed/lead";

  for (let i = 0; i < pogingen; i++) {
    if (i > 0) await slaap(wacht[Math.min(i - 1, wacht.length - 1)]);
    const a = await eenPoging(url, payload, fetchFn, timeoutMs);
    if (a.soort === "ok") return { soort: "ok", viaReserve: false };
    if (a.soort === "definitief") return a;
  }
  if (o.reserveUrl) {
    const a = await eenPoging(o.reserveUrl, payload, fetchFn, timeoutMs);
    if (a.soort === "ok") return { soort: "ok", viaReserve: true };
    if (a.soort === "definitief") return a;
  }
  return { soort: "later" };
}

// Probeert wat er nog in de wachtrij staat (bij een volgend bezoek of zodra de
// verbinding terug is). Eén poging per aanvraag; wat lukt (of definitief
// afgewezen wordt) gaat uit de wachtrij. Geeft de verstuurde sleutels terug.
export async function leegWachtrij(opties: VerstuurOpties & { opslag?: Opslag | null; toolId?: string } = {}): Promise<string[]> {
  const verstuurd: string[] = [];
  for (const item of leesWachtrij(opties.opslag)) {
    if (opties.toolId && item.toolId !== opties.toolId) continue;
    const uitslag = await verstuurMetHerhaling(item, { ...opties, pogingen: 1 });
    if (uitslag.soort === "ok") {
      verstuurd.push(item.sleutel);
      verwijderUitWachtrij(item.sleutel, opties.opslag);
    } else if (uitslag.soort === "definitief") {
      verwijderUitWachtrij(item.sleutel, opties.opslag);
    }
  }
  return verstuurd;
}

type SamenvattingSnapshot = {
  regels?: { naam: string; aantal?: number; eenheid?: string; materiaal?: string }[];
  totaal?: number;
};

// Tekst voor de mail die de bezoeker zelf kan versturen als het automatisch
// versturen niet lukt.
export function maakAanvraagTekst(
  p: { naam: string; email: string; telefoonnummer: string; snapshot: unknown },
  bedrijfsnaam: string,
  formatBedrag: (n: number) => string
): string {
  const snap = (p.snapshot ?? {}) as SamenvattingSnapshot;
  const regels = (snap.regels ?? []).map((r) => {
    const aantal = r.aantal != null ? ` – ${r.aantal}${r.eenheid ? ` ${r.eenheid}` : ""}` : "";
    return `- ${r.naam}${aantal}${r.materiaal ? ` (${r.materiaal})` : ""}`;
  });
  return [
    `Aanvraag voor ${bedrijfsnaam}`,
    "",
    ...regels,
    typeof snap.totaal === "number" ? `Indicatie totaal (incl. btw): ${formatBedrag(snap.totaal)}` : "",
    "",
    `Naam: ${p.naam}`,
    `E-mail: ${p.email}`,
    p.telefoonnummer ? `Telefoon: ${p.telefoonnummer}` : "",
  ]
    .filter((r, i, rij) => r !== "" || rij[i - 1] !== "")
    .join("\n")
    .trim();
}

export function maakMailtoLink(email: string, onderwerp: string, tekst: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst.slice(0, 1500))}`;
}
