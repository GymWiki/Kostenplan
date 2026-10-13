// Wat de klant of hovenier typt ("8011 AB 12", "8011ab 12a", "8011AB 12-3") naar postcode, huisnummer en toevoeging.
export type AdresRuw = { postcode: string; huisnummer: string; toevoeging: string };

export function parseAdresInvoer(tekst: string): AdresRuw | null {
  const m = tekst.trim().match(/^(\d{4})\s*([A-Za-z]{2})[\s,]*(\d{1,5})\s*[-\s]?\s*([A-Za-z0-9]{0,6})$/);
  if (!m) return null;
  return { postcode: `${m[1]}${m[2].toUpperCase()}`, huisnummer: m[3], toevoeging: m[4] ?? "" };
}

// Hoe een adres in één regel wordt getoond: "Dennenlaan 12, 3511 AB Utrecht".
export function adresRegel(a: { straat: string; huisnummer: string; postcode: string; plaats: string }): string {
  const pc = a.postcode.replace(/^(\d{4})\s*([A-Za-z]{2})$/, "$1 $2");
  return `${[a.straat, a.huisnummer].filter(Boolean).join(" ")}, ${pc} ${a.plaats}`.replace(/^, /, "").trim();
}
