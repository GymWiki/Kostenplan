// Startwaarden voor de eenmalige "basistarieven"-vraag in de wizard. Dit zijn
// tevens de database-defaults van CostSettings/Company: zolang een tool nog
// precies deze waarden heeft, heeft de hovenier ze nooit zelf bevestigd.
// TODO(Pieter): echte voorbeeldwaarden invullen (alleen een startsuggestie).
export const BASIS_TARIEVEN_DEFAULTS = {
  arbeidTariefUur: 45,
  arbeidTariefDagdeel: 180,
  arbeidTariefDag: 360,
  voorrijTarief: 35,
  transportTarief: 0,
} as const;

type Waarden = {
  arbeidStapEenheid: string;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  voorrijTarief: number;
  transportTarief: number;
};

// "Nog niet ingesteld" = alles nog op de defaults én nog op UUR (de
// databasedefault). Kiest de hovenier in de kaart dag/dagdeel, dan is dit
// meteen niet meer waar. Zo is er geen migratie of extra vlag nodig.
export function zijnBasisTarievenNogDefault(
  cs: Waarden | null,
  company: { standaardArbeidTariefUur: number; standaardVoorrijTarief: number }
): boolean {
  if (!cs) return true;
  const d = BASIS_TARIEVEN_DEFAULTS;
  return (
    cs.arbeidStapEenheid === "UUR" &&
    cs.arbeidTariefUur === d.arbeidTariefUur &&
    cs.arbeidTariefDagdeel === d.arbeidTariefDagdeel &&
    cs.arbeidTariefDag === d.arbeidTariefDag &&
    cs.voorrijTarief === d.voorrijTarief &&
    cs.transportTarief === d.transportTarief &&
    company.standaardArbeidTariefUur === d.arbeidTariefUur &&
    company.standaardVoorrijTarief === d.voorrijTarief
  );
}
