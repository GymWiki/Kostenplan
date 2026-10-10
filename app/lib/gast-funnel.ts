import { GAST_GEBEURTENISSEN } from "@/app/lib/gast";

export type FunnelRij = { week: string; bron: string; type: string; aantal: number };

export const FUNNEL_VOLGORDE = GAST_GEBEURTENISSEN;

// Rijen (week, bron, type, aantal) → tabel per groep (week of bron) met een
// kolom per gebeurtenis.
export function pivotFunnel(rijen: FunnelRij[], groepeerOp: "week" | "bron") {
  const groepen = new Map<string, Record<string, number>>();
  for (const r of rijen) {
    const sleutel = r[groepeerOp];
    const rij = groepen.get(sleutel) ?? {};
    rij[r.type] = (rij[r.type] ?? 0) + r.aantal;
    groepen.set(sleutel, rij);
  }
  return [...groepen.entries()]
    .sort((a, b) => (groepeerOp === "week" ? b[0].localeCompare(a[0]) : (b[1].probeer_bekeken ?? 0) - (a[1].probeer_bekeken ?? 0)))
    .map(([naam, waarden]) => ({ naam, waarden }));
}
