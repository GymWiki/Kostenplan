export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Bedrag uit calculateBreakdownRange(): een vast getal, of een {min,max}
// bandbreedte (zie app/lib/calculate.ts).
export function formatCurrencyRange(bedrag: number | { min: number; max: number }) {
  if (typeof bedrag === "number") return formatCurrency(bedrag);
  return `${formatCurrency(bedrag.min)} – ${formatCurrency(bedrag.max)}`;
}
