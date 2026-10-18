// Werktempo in uur, dagdeel of dag: de ene plek voor alles wat met die eenheden te maken heeft.
//
// Interne basis zijn uren. Een product heeft een werktempo (bijv. 12 m² per dagdeel) in zijn eigen eenheid of, zonder eigen
// eenheid, in de eenheid van de rekentool (CostSettings.arbeidStapEenheid). Wat een dagdeel en een dag in uren zijn, stelt de
// hovenier in (standaard 4 en 8). Nergens anders in de code wordt met 4 of 8 vermenigvuldigd: alles loopt via deze functies.
//
//   uren nodig      = hoeveelheid / werktempo × urenPerEenheid(eenheid van het product)
//   arbeidskosten   = uren nodig × uurtarief
//   uurtarief       = tarief van de rekentool / urenPerEenheid(eenheid van de rekentool)

export type WerktempoEenheid = "UUR" | "DAGDEEL" | "DAG";
export type UrenConfig = { urenPerDagdeel: number; urenPerDag: number };

export const STANDAARD_UREN: UrenConfig = { urenPerDagdeel: 4, urenPerDag: 8 };
export const MAX_UREN = 24;

export const EENHEID_NAAM: Record<WerktempoEenheid, { enkelvoud: string; meervoud: string }> = {
  UUR: { enkelvoud: "uur", meervoud: "uren" },
  DAGDEEL: { enkelvoud: "dagdeel", meervoud: "dagdelen" },
  DAG: { enkelvoud: "dag", meervoud: "dagen" },
};

export function urenPerEenheid(eenheid: WerktempoEenheid, c: UrenConfig = STANDAARD_UREN): number {
  if (eenheid === "UUR") return 1;
  return eenheid === "DAGDEEL" ? c.urenPerDagdeel : c.urenPerDag;
}

// Floating-pointruis weg: ligt de waarde (op ~1e-13 na) op een getal met hooguit 12 significante cijfers, dan wordt dat getal genomen.
// Zo komt heen-en-weer omrekenen (ook met 7,5 of 3,5 uur) exact terug, terwijl een waarde als 21,428571428571… zijn volle precisie houdt.
export function schoon(n: number): number {
  if (!Number.isFinite(n)) return n;
  const r = Number(n.toPrecision(12));
  return Math.abs(r - n) <= Math.abs(n) * 1e-13 ? r : n;
}

// De eenheid waarin het werktempo van een product staat: de eigen keuze, anders die van de rekentool.
export function effectieveEenheid(productEenheid: WerktempoEenheid | null | undefined, globaal: WerktempoEenheid): WerktempoEenheid {
  return productEenheid ?? globaal;
}

// nieuwe waarde = waarde × urenNaar / urenVan. Voorbeelden met de standaard: uur → dag × 8, uur → dagdeel × 4, dagdeel → dag × 2, dag → uur ÷ 8.
// (Een werktempo is "hoeveelheid per eenheid": per langere eenheid doe je meer.)
export function convertWerktempo(waarde: number, van: WerktempoEenheid, naar: WerktempoEenheid, c: UrenConfig = STANDAARD_UREN): number {
  if (van === naar) return waarde;
  return schoon((waarde * urenPerEenheid(naar, c)) / urenPerEenheid(van, c));
}

// Een tarief per `van` omrekenen naar een tarief per `naar` (zelfde prijs per uur): € 320 per dag = € 40 per uur.
export function convertTarief(bedrag: number, van: WerktempoEenheid, naar: WerktempoEenheid, c: UrenConfig = STANDAARD_UREN): number {
  if (van === naar) return bedrag;
  return schoon((bedrag * urenPerEenheid(naar, c)) / urenPerEenheid(van, c));
}

export function uurtarief(tariefPerEenheid: number, eenheid: WerktempoEenheid, c: UrenConfig = STANDAARD_UREN): number {
  return tariefPerEenheid / urenPerEenheid(eenheid, c);
}

// "12" / "12,5" / "4,67": maximaal 2 decimalen in de UI, intern blijft de volle precisie.
export function formatWerktempo(n: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(n);
}

export type UrenFouten = { urenPerDagdeel?: string; urenPerDag?: string };

// Een getal > 0 en ten hoogste 24 uur; een dagdeel kan niet langer zijn dan een dag. Decimalen mogen (7,5).
export function valideerUrenConfig(c: UrenConfig): { ok: true; config: UrenConfig } | { ok: false; fouten: UrenFouten } {
  const fouten: UrenFouten = {};
  const veld = (n: number, wat: string): string | undefined => {
    if (!Number.isFinite(n)) return `Vul in hoeveel uur ${wat} is.`;
    if (n <= 0) return `${wat[0]!.toUpperCase()}${wat.slice(1)} moet meer dan 0 uur zijn.`;
    if (n > MAX_UREN) return `${wat[0]!.toUpperCase()}${wat.slice(1)} kan niet langer dan ${MAX_UREN} uur zijn.`;
    return undefined;
  };
  const f1 = veld(c.urenPerDagdeel, "een dagdeel");
  const f2 = veld(c.urenPerDag, "een dag");
  if (f1) fouten.urenPerDagdeel = f1;
  if (f2) fouten.urenPerDag = f2;
  if (!f1 && !f2 && c.urenPerDagdeel > c.urenPerDag) fouten.urenPerDagdeel = "Een dagdeel kan niet langer zijn dan een dag.";
  return Object.keys(fouten).length > 0 ? { ok: false, fouten } : { ok: true, config: { urenPerDagdeel: c.urenPerDagdeel, urenPerDag: c.urenPerDag } };
}

// ---- Plannen: wat er verandert bij een wissel. Puur, zodat de dialog (client) en de server-actie (die opnieuw uit de
// database rekent) precies dezelfde getallen krijgen. -------------------------------------------------------------------

export type PlanProduct = {
  id: string;
  naam: string;
  // null = volgt de rekentool.
  eenheid: WerktempoEenheid | null;
  werktempo: number | null;
  // Het eigen werktempo per materiaal (in dezelfde eenheid als het product); null = geen eigen tempo.
  materiaalTempos: { id: string; werktempo: number | null }[];
  // Eigen arbeidstarief van dit product, per eenheid van de rekentool; null = het tarief van de rekentool.
  arbeidTariefOverride: number | null;
};

export type ProductWissel = {
  eenheid: WerktempoEenheid | null;
  werktempo: number | null;
  materiaalTempos: { id: string; werktempo: number | null }[];
};

// Eén product wisselt van eenheid (naar een eigen eenheid, of terug naar "Standaard" = de eenheid van de rekentool).
export function planProductWissel(p: PlanProduct, nieuw: WerktempoEenheid | null, globaal: WerktempoEenheid, c: UrenConfig): ProductWissel & { van: WerktempoEenheid; naar: WerktempoEenheid; verandert: boolean } {
  const van = effectieveEenheid(p.eenheid, globaal);
  const naar = effectieveEenheid(nieuw, globaal);
  return {
    eenheid: nieuw,
    werktempo: p.werktempo === null ? null : convertWerktempo(p.werktempo, van, naar, c),
    materiaalTempos: p.materiaalTempos.map((m) => ({ id: m.id, werktempo: m.werktempo === null ? null : convertWerktempo(m.werktempo, van, naar, c) })),
    van,
    naar,
    verandert: van !== naar,
  };
}

export type GlobaleWissel = {
  van: WerktempoEenheid;
  naar: WerktempoEenheid;
  // Het nieuwe tarief per `naar`, zo dat de prijs per uur gelijk blijft.
  nieuwTarief: number;
  // Producten zonder eigen eenheid: hun werktempo's worden omgerekend.
  meeveranderend: (ProductWissel & { id: string; naam: string; arbeidTariefOverride: number | null })[];
  // Producten met een eigen eenheid: eenheid en werktempo blijven staan (alleen een eigen tarief wordt meeomgerekend).
  behouden: { id: string; naam: string; eenheid: WerktempoEenheid; arbeidTariefOverride: number | null }[];
};

// De eenheid van de rekentool wisselt. De prijs verandert niet: werktempo's van wie de standaard volgt worden omgerekend, het tarief
// (en een eigen tarief per product) gaat mee naar de nieuwe eenheid, en producten met een eigen eenheid blijven zoals ze zijn.
export function planGlobaleWissel(args: { producten: PlanProduct[]; van: WerktempoEenheid; naar: WerktempoEenheid; tarief: number; uren: UrenConfig }): GlobaleWissel {
  const { producten, van, naar, tarief, uren } = args;
  const tarifeer = (t: number | null) => (t === null ? null : convertTarief(t, van, naar, uren));
  const meeveranderend: GlobaleWissel["meeveranderend"] = [];
  const behouden: GlobaleWissel["behouden"] = [];
  for (const p of producten) {
    if (p.eenheid === null) {
      // Het product blijft "Standaard"; alleen de getallen wisselen van eenheid.
      const om = (w: number | null) => (w === null ? null : convertWerktempo(w, van, naar, uren));
      meeveranderend.push({ id: p.id, naam: p.naam, eenheid: null, werktempo: om(p.werktempo), materiaalTempos: p.materiaalTempos.map((m) => ({ id: m.id, werktempo: om(m.werktempo) })), arbeidTariefOverride: tarifeer(p.arbeidTariefOverride) });
    } else {
      behouden.push({ id: p.id, naam: p.naam, eenheid: p.eenheid, arbeidTariefOverride: tarifeer(p.arbeidTariefOverride) });
    }
  }
  return { van, naar, nieuwTarief: convertTarief(tarief, van, naar, uren), meeveranderend, behouden };
}

export type UrenWissel = {
  // Producten met een eigen eenheid die een andere dan die van de rekentool is: alleen bij hen hangt de prijs van de uren-definities af.
  rakend: { id: string; naam: string; eenheid: WerktempoEenheid; werktempo: number | null; materiaalTempos: { id: string; werktempo: number | null }[]; nieuwWerktempo: number | null; nieuweMateriaalTempos: { id: string; werktempo: number | null }[] }[];
};

// De uren-definities veranderen. Wie in de eenheid van de rekentool rekent (of die volgt) houdt dezelfde prijs. Een product met een
// andere eigen eenheid zou anders uitkomen; `nieuwWerktempo` is het werktempo waarmee zijn prijs gelijk blijft (kiest de gebruiker daarvoor).
export function planUrenWissel(args: { producten: PlanProduct[]; globaal: WerktempoEenheid; oud: UrenConfig; nieuw: UrenConfig }): UrenWissel {
  const { producten, globaal, oud, nieuw } = args;
  const rakend: UrenWissel["rakend"] = [];
  for (const p of producten) {
    if (p.eenheid === null || p.eenheid === globaal) continue;
    // prijs ∝ uren(E)/uren(G) / werktempo  →  werktempo' = werktempo × [uren'(E)/uren'(G)] / [uren(E)/uren(G)]
    const factor = urenPerEenheid(p.eenheid, nieuw) / urenPerEenheid(globaal, nieuw) / (urenPerEenheid(p.eenheid, oud) / urenPerEenheid(globaal, oud));
    const schaal = (w: number | null) => (w === null ? null : schoon(w * factor));
    rakend.push({ id: p.id, naam: p.naam, eenheid: p.eenheid, werktempo: p.werktempo, materiaalTempos: p.materiaalTempos, nieuwWerktempo: schaal(p.werktempo), nieuweMateriaalTempos: p.materiaalTempos.map((m) => ({ id: m.id, werktempo: schaal(m.werktempo) })) });
  }
  return { rakend };
}
