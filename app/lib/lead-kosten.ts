import type { LeadSnapshot } from "./leads";

// De kostenrijen onder "Wat de klant koos", uit dezelfde berekening als het subtotaal: de regels erboven plus
// deze rijen tellen op tot het subtotaal. Een aanvulling tot het minimumtarief en een afstandstoeslag zijn eigen
// rijen (niet weggestopt bij materiaal- of voorrijkosten). Oudere snapshots hebben alleen de vier totalen.
export type KostenRij = { label: string; waarde: number };

export function kostenRijen(snapshot: LeadSnapshot): KostenRij[] {
  const k = snapshot.rekenkern?.resultaat?.kosten;
  if (!k) {
    return [
      { label: "Arbeidskosten", waarde: snapshot.arbeidskosten },
      { label: "Materiaalkosten", waarde: snapshot.materiaalkosten },
      { label: "Transportkosten", waarde: snapshot.transportkosten },
      { label: "Voorrijkosten", waarde: snapshot.voorrijkosten },
    ];
  }
  const euro = (c: number) => c / 100;
  const rijen: KostenRij[] = [
    { label: "Arbeidskosten", waarde: euro(k.arbeid) },
    { label: "Materiaalkosten", waarde: euro(k.materiaal + k.extra + k.artikel) },
    { label: "Transportkosten", waarde: euro(k.transport) },
    { label: "Voorrijkosten", waarde: euro(k.voorrijkosten) },
  ];
  if (k.afstand > 0) rijen.push({ label: "Afstandstoeslag", waarde: euro(k.afstand) });
  if (k.minimum > 0) rijen.push({ label: "Aanvulling tot minimumtarief", waarde: euro(k.minimum) });
  return rijen;
}
