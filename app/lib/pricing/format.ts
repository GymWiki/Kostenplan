// Eén plek voor het tonen van bedragen, hoeveelheden en eenheden (nl-NL). Alles wat een prijs of
// hoeveelheid op het scherm, in een mail of in een PDF zet, gebruikt deze functies.

const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const getalFmt = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

// "€ 1.234,56" voor een bedrag in centen. Geen eindige invoer wordt "€ 0,00".
export function formatCenten(centen: number): string {
  return euroFmt.format(Number.isFinite(centen) ? centen / 100 : 0);
}

// Voor een bedrag in euro's (oudere velden zoals Lead.totaalIndicatie). Rondt op hele centen.
export function formatEuro(euro: number): string {
  return formatCenten(Math.round((Number.isFinite(euro) ? euro : 0) * 100));
}

export function formatBandbreedte(minCenten: number, maxCenten: number): string {
  return `${formatCenten(minCenten)} – ${formatCenten(maxCenten)}`;
}

// Opgeslagen eenheden naar wat de klant leest. Bekend: m1 → m, m2 → m², m3 → m³, stuks. Een eigen
// eenheid blijft zoals de hovenier hem schreef.
const EENHEDEN: Record<string, string> = {
  m1: "m",
  m: "m",
  m2: "m²",
  m3: "m³",
  stuks: "stuks",
  stuk: "stuks",
  uur: "uur",
  dagdeel: "dagdeel",
  dag: "dag",
  post: "post",
  set: "set",
  kg: "kg",
  ton: "ton",
  liter: "liter",
  zak: "zak",
  pallet: "pallet",
  rol: "rol",
  km: "km",
  stelpost: "post",
  vast: "vast bedrag",
  procent: "%",
};

export function formatEenheid(eenheid: string | null | undefined): string {
  if (!eenheid) return "";
  return EENHEDEN[eenheid] ?? eenheid;
}

// Meervoud voor tijdseenheden ("2 dagdelen"); andere eenheden blijven gelijk.
const MEERVOUD: Record<string, string> = { uur: "uur", dagdeel: "dagdelen", dag: "dagen" };

// "12,5" of "20": hoeveelheid zonder onnodige decimalen, maximaal twee.
export function formatAantal(aantal: number): string {
  return getalFmt.format(Number.isFinite(aantal) ? aantal : 0);
}

// "20 m²", "1,5 dagdeel" (1,5 is enkelvoud in het Nederlands), "2 dagdelen".
export function formatHoeveelheid(aantal: number, eenheid: string | null | undefined): string {
  const e = formatEenheid(eenheid);
  const meervoud = aantal > 1 && eenheid && MEERVOUD[eenheid] ? MEERVOUD[eenheid] : e;
  return `${formatAantal(aantal)}${meervoud ? ` ${meervoud}` : ""}`;
}
