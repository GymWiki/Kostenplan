import { werkgebiedInstellingenSchema, type WerkgebiedInstellingen } from "./schema";
import { parsePostcodes } from "./postcodes";

// Controles op instellingen die het schema zelf niet kan: één foutmelding in gewoon Nederlands.
export function valideerInstellingen(ruw: unknown): { ok: true; waarde: WerkgebiedInstellingen } | { ok: false; error: string } {
  const r = werkgebiedInstellingenSchema.safeParse(ruw);
  if (!r.success) return { ok: false, error: "Een van de ingevulde waarden klopt niet. Controleer de bedragen en afstanden." };
  const i = r.data;
  const w = i.werkgebied;
  if (w.aan) {
    if (w.methode === "STRAAL") {
      if (!w.start) return { ok: false, error: "Vul het adres in waar je werkgebied begint (postcode en huisnummer)." };
    } else {
      const p = parsePostcodes(w.postcodes);
      if (p.fouten.length > 0) return { ok: false, error: `Deze postcodes herken ik niet: ${p.fouten.slice(0, 5).join(", ")}. Gebruik 4 cijfers, bijv. 8000 of 8000-8099.` };
      if (p.reeksen.length === 0) return { ok: false, error: "Vul minstens één postcode of postcodereeks in." };
    }
    if (w.buiten === "TOESLAG") {
      if (w.methode !== "STRAAL") return { ok: false, error: "Een afstandstoeslag kan alleen bij een werkgebied met een straal." };
      if (w.toeslag.modus === "ZONES") {
        let vorige = 0;
        for (const z of w.toeslag.zones) {
          if (z.totKm !== null) {
            if (z.totKm <= vorige) return { ok: false, error: "De zones moeten oplopen: elke zone eindigt verder dan de vorige." };
            vorige = z.totKm;
          }
        }
        const laatste = w.toeslag.zones[w.toeslag.zones.length - 1];
        if (w.toeslag.zones.length === 0 || laatste.totKm !== null) return { ok: false, error: "Eindig met een zone zonder grens (\"en verder\"), zodat elke afstand een toeslag of 'niet mogelijk' heeft." };
        if (w.toeslag.zones.slice(0, -1).some((z) => z.totKm === null)) return { ok: false, error: "Alleen de laatste zone mag \"en verder\" zijn." };
      }
    }
  }
  if (i.minimum.aan && !(i.minimum.bedragEuro > 0)) return { ok: false, error: "Vul een minimumbedrag in." };
  return { ok: true, waarde: i };
}
