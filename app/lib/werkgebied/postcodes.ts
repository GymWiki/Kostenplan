// Postcodegebieden: 4-cijferige postcodes en reeksen, bijv. "8000-8099, 8101, 8200–8210".

export type PostcodeReeks = [number, number];

export type PostcodeParse = { reeksen: PostcodeReeks[]; fouten: string[]; aantal: number };

// Accepteert komma's, puntkomma's, spaties en regeleinden als scheiding en -, – of — als reeksteken.
export function parsePostcodes(tekst: string): PostcodeParse {
  const reeksen: PostcodeReeks[] = [];
  const fouten: string[] = [];
  const stukken = tekst
    .replace(/[–—]/g, "-")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stuk of stukken) {
    // Een volledige postcode met letters (8011AB) telt als het gebied 8011.
    const m = stuk.match(/^(\d{4})(?:[A-Za-z]{2})?(?:-(\d{4})(?:[A-Za-z]{2})?)?$/);
    if (!m) {
      fouten.push(stuk);
      continue;
    }
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1000 || b < 1000 || a > 9999 || b > 9999) {
      fouten.push(stuk);
      continue;
    }
    if (b < a) fouten.push(stuk);
    else reeksen.push([a, b]);
  }
  const samen = voegSamen(reeksen);
  return { reeksen: samen, fouten, aantal: samen.reduce((s, [a, b]) => s + (b - a + 1), 0) };
}

function voegSamen(reeksen: PostcodeReeks[]): PostcodeReeks[] {
  const gesorteerd = [...reeksen].sort((x, y) => x[0] - y[0]);
  const uit: PostcodeReeks[] = [];
  for (const [a, b] of gesorteerd) {
    const laatste = uit[uit.length - 1];
    if (laatste && a <= laatste[1] + 1) laatste[1] = Math.max(laatste[1], b);
    else uit.push([a, b]);
  }
  return uit;
}

// Eerste vier cijfers van wat de klant typte ("8011 AB", "8011ab", "8011"). null als er geen geldige postcode in zit.
export function postcodeCijfers(invoer: string): number | null {
  const m = invoer.trim().match(/^(\d{4})\s*[A-Za-z]{0,2}$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1000 && n <= 9999 ? n : null;
}

export function postcodeInReeksen(postcode: number, reeksen: readonly PostcodeReeks[]): boolean {
  return reeksen.some(([a, b]) => postcode >= a && postcode <= b);
}

// Normaliseert naar "8011 AB" (of "8011" zonder letters).
export function formatPostcode(invoer: string): string {
  const m = invoer.trim().match(/^(\d{4})\s*([A-Za-z]{2})?$/);
  if (!m) return invoer.trim();
  return m[2] ? `${m[1]} ${m[2].toUpperCase()}` : m[1];
}

// Compacte weergave van de reeksen, voor in de instellingen: "8000–8099, 8101".
export function formatReeksen(reeksen: readonly PostcodeReeks[]): string {
  return reeksen.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(", ");
}
