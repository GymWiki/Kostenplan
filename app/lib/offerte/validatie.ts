// Validatie van bedrijfsgegevens voor op de offerte. Puur en zonder
// afhankelijkheden, zodat client en server dezelfde regels gebruiken.

export function normaliseerKvk(waarde: string): string {
  return waarde.replace(/\s|\./g, "");
}
// KvK-nummer: precies 8 cijfers.
export function isGeldigKvk(waarde: string): boolean {
  return /^\d{8}$/.test(normaliseerKvk(waarde));
}

export function normaliseerBtwId(waarde: string): string {
  return waarde.replace(/[\s.]/g, "").toUpperCase();
}
// Nederlands btw-id: NL + 9 cijfers + B + 2 cijfers.
export function isGeldigBtwId(waarde: string): boolean {
  return /^NL\d{9}B\d{2}$/.test(normaliseerBtwId(waarde));
}

const IBAN_LENGTE: Record<string, number> = { NL: 18, BE: 16, DE: 22, FR: 27, LU: 20, GB: 22 };

export function normaliseerIban(waarde: string): string {
  return waarde.replace(/\s/g, "").toUpperCase();
}
export function formatteerIban(waarde: string): string {
  return normaliseerIban(waarde).replace(/(.{4})/g, "$1 ").trim();
}
// IBAN: lengte per land (NL = 18) en controlegetal volgens mod 97.
export function isGeldigIban(waarde: string): boolean {
  const iban = normaliseerIban(waarde);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const land = iban.slice(0, 2);
  const verwacht = IBAN_LENGTE[land];
  if (verwacht && iban.length !== verwacht) return false;
  const omgezet = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of omgezet) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

export function isGeldigEmail(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waarde.trim());
}

export function normaliseerPostcode(waarde: string): string {
  const m = waarde.replace(/\s/g, "").toUpperCase().match(/^(\d{4})([A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : waarde.trim();
}
export function isGeldigPostcode(waarde: string): boolean {
  return /^\d{4} ?[A-Za-z]{2}$/.test(waarde.trim());
}
