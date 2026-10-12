// Offertenummer: <prefix><jaar>-<volgnummer, 4 cijfers>, bijv. 2026-0001 of HV-2026-0012.
export function formatteerOfferteNummer(prefix: string, jaar: number, volgnummer: number): string {
  const p = prefix.trim();
  return `${p ? `${p}-` : ""}${jaar}-${String(volgnummer).padStart(4, "0")}`;
}
