import { formatCenten, formatEuro } from "@/app/lib/pricing/format";

// Bedragen in euro's tonen. Alle opmaak van bedragen loopt via app/lib/pricing/format.ts; deze
// functies bestaan voor plekken die met euro's (i.p.v. centen) werken.
export function formatCurrency(amount: number) {
  return formatEuro(amount);
}

// Bedrag uit de rekentool: een vast getal, of een {min,max} bandbreedte.
export function formatCurrencyRange(bedrag: number | { min: number; max: number }) {
  if (typeof bedrag === "number") return formatCurrency(bedrag);
  return `${formatCurrency(bedrag.min)} – ${formatCurrency(bedrag.max)}`;
}

export { formatCenten };
