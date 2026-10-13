import { berekenHoeveelheidVoorSjabloon, coerceVeldWaarden, klantVeldenVoorSjabloon, type SjabloonRegelResultaat } from "@/app/lib/sjablonen";
import { ceilStap, MAX_BEDRAG_CENTEN, rondCenten, schoonGetal } from "./rond";
import { regelTotaal, totalenVanRegels, type BtwGroep } from "./totalen";
import { aanvullingTotMinimum, beoordeelLocatie, beoordeelMinimum, type LocatieBeoordeling } from "./locatie";
import type { ArbeidEenheid, PricingCategorie, PricingConfig, PricingInput, PricingMateriaal, PricingOnderdeel, PricingOnderdeelInvoer } from "./schema";

// De rekenkern: de enige bron van waarheid voor prijzen. Puur TypeScript, zonder React, database
// of netwerk; draait in de browser (rekentool, editor) en op de server (aanvraag, offerte).
//
// Alle bedragen in de uitvoer zijn gehele centen. Elke regel wordt op hele centen afgerond
// (half omhoog, zie rond.ts); het totaal is altijd de som van de regels. Ongeldige invoer
// (leeg, NaN, negatief, oneindig, absurd groot) geeft nooit een kapotte prijs, maar 0 of een
// begrensde waarde plus een waarschuwing.

export const DAGDELEN_PER_DAG = 2;
export const UREN_PER_DAG = 8;

export type RegelSoort = "materiaal" | "arbeid" | "extra" | "artikel" | "transport" | "voorrijkosten" | "afstand" | "minimum";

export type PrijsRegel = {
  // Stabiel per regel: `<onderdeel>:materiaal:<categorie>`, `<onderdeel>:arbeid`, `project:transport`, …
  id: string;
  onderdeelId: string | null;
  soort: RegelSoort;
  omschrijving: string;
  // Naam van de materiaalcategorie (alleen bij soort "materiaal").
  categorie?: string;
  // Hoeveelheid, arbeidstijd, aantal dagen of 1 (vaste post).
  aantal: number;
  // Opgeslagen eenheid ("m2", "stuks", …), "dagdeel"/"uur"/"dag" bij arbeid, "post" bij vaste kosten.
  eenheid: string;
  // Mag een deel van een cent bevatten; bedragExclCenten is het afgeronde regelbedrag.
  prijsPerEenheidCenten: number;
  bedragExclCenten: number;
  btwPercentage: number;
  btwCenten: number;
  bedragInclCenten: number;
};

export type WaarschuwingCode =
  | "ongeldige-invoer"
  | "hoeveelheid-te-groot"
  | "ontbrekende-prijs"
  | "ontbrekende-keuze"
  | "onbekende-keuze"
  | "geen-werktempo"
  | "bandbreedte-onvolledig"
  | "bedrag-te-groot";

export type Waarschuwing = { code: WaarschuwingCode; onderdeelId?: string; bericht: string };

// "afstand" is de afstandstoeslag, "minimum" de aanvulling tot het minimumtarief (beide projectregels).
export type KostenPerSoort = { materiaal: number; arbeid: number; extra: number; artikel: number; transport: number; voorrijkosten: number; afstand: number; minimum: number };

export type Markering = "BUITEN_WERKGEBIED" | "ONDER_MINIMUM" | "WERKGEBIED_NIET_GECONTROLEERD";

export type WerkgebiedUitkomst = {
  enabled: boolean;
  // true = binnen, false = buiten, "unknown" = niet te bepalen (geen adres, PDOK onbereikbaar).
  withinServiceArea: boolean | "unknown";
  distanceKm: number | null;
  surchargeCenten: number;
  allowed: boolean;
  reason: "outside" | "zone-not-possible" | null;
};

export type MinimumUitkomst = {
  enabled: boolean;
  // Het totaal (incl. btw) lag onder het minimumbedrag, vóór een eventuele aanvulling.
  belowMinimum: boolean;
  minimumInclCenten: number;
  // De aanvulling tot het minimumtarief (excl. btw); 0 als er niet is aangevuld.
  topUpCenten: number;
  allowed: boolean;
};

export type OnderdeelUitkomst = {
  id: string;
  naam: string;
  eenheid: string;
  hoeveelheid: number;
  regels: PrijsRegel[];
  // Som van de regels van dit onderdeel (excl. btw), in centen.
  subtotaalExclCenten: number;
  kosten: KostenPerSoort;
  // Arbeidstijd zoals gerekend (na afronden), in de eenheid van het tarief.
  arbeidstijd: number;
  // Aantal begonnen werkdagen als transport per dag geldt.
  transportDagen: number | null;
};

export type Samenvatting = { kosten: KostenPerSoort; subtotaalExclCenten: number; btwCenten: number; totaalInclCenten: number };

// Bereik van van–tot. Bij PER_PRODUCT is elk onderdeel van de samenvatting apart doorgerekend met
// de laagste en de hoogste prijs per materiaal; bij TOTAAL is alleen het eindtotaal ± marge.
export type Bandbreedte = { modus: "PER_PRODUCT" | "TOTAAL"; min: Samenvatting; max: Samenvatting; margeOmlaag?: number; margeOmhoog?: number };

export type PricingResult = {
  versie: 1;
  onderdelen: OnderdeelUitkomst[];
  // Vaste kosten die één keer per aanvraag gelden (alleen bij vasteKosten PER_AANVRAAG).
  projectRegels: PrijsRegel[];
  // Alle regels in volgorde: per onderdeel, daarna de projectregels.
  regels: PrijsRegel[];
  kosten: KostenPerSoort;
  subtotaalExclCenten: number;
  btwGroepen: BtwGroep[];
  btwCenten: number;
  totaalInclCenten: number;
  kor: boolean;
  btwPercentage: number;
  // Alleen gezet als de tool een bandbreedte toont én het bereik echt verschilt.
  bandbreedte: Bandbreedte | null;
  // Arbeid in dagdelen en het aantal begonnen werkdagen (2 dagdelen per dag).
  doorlooptijd: { dagdelen: number; werkdagen: number } | null;
  waarschuwingen: Waarschuwing[];
  heeftSelectie: boolean;
  // Werkgebied en minimale opdracht. Staan ze uit, dan is alles "toegestaan" en zonder markering.
  serviceArea: WerkgebiedUitkomst;
  minimum: MinimumUitkomst;
  // Mag een aanvraag worden gedaan volgens het werkgebied én het minimum (de selectie zelf niet meegerekend).
  requestAllowed: boolean;
  flags: Markering[];
};

type Richting = "MIN" | "MAX" | "MIDDEN";

const leegKosten = (): KostenPerSoort => ({ materiaal: 0, arbeid: 0, extra: 0, artikel: 0, transport: 0, voorrijkosten: 0, afstand: 0, minimum: 0 });

export function dagdelenVoorArbeid(tijd: number, eenheid: ArbeidEenheid): number {
  if (eenheid === "UUR") return (tijd / UREN_PER_DAG) * DAGDELEN_PER_DAG;
  if (eenheid === "DAG") return tijd * DAGDELEN_PER_DAG;
  return tijd;
}

function dagenVoorArbeid(tijd: number, eenheid: ArbeidEenheid): number {
  return dagdelenVoorArbeid(tijd, eenheid) / DAGDELEN_PER_DAG;
}

const ARBEID_LABEL: Record<ArbeidEenheid, string> = { UUR: "uur", DAGDEEL: "dagdeel", DAG: "dag" };

function materiaalPrijs(m: PricingMateriaal, richting: Richting, w: Waarschuwing[], onderdeelId: string): number {
  if (m.prijsType !== "BANDBREEDTE") return m.prijsCenten;
  if (m.prijsMinCenten == null || m.prijsMaxCenten == null) {
    w.push({ code: "bandbreedte-onvolledig", onderdeelId, bericht: `${m.naam} heeft een bandbreedte zonder van- en tot-prijs. De vaste prijs wordt gebruikt.` });
    return m.prijsCenten;
  }
  if (richting === "MIN") return m.prijsMinCenten;
  if (richting === "MAX") return m.prijsMaxCenten;
  return (m.prijsMinCenten + m.prijsMaxCenten) / 2;
}

// Een categorie met precies één optie heeft niets te kiezen: die optie telt automatisch mee.
// Anders telt de keuze van de klant (of niets als er nog niet gekozen is).
export function geselecteerdeMateriaalId(materialen: readonly { id: string }[], keuze: string | undefined): string | null {
  if (materialen.length === 1) return materialen[0].id;
  return keuze ?? null;
}

function gekozenMateriaal(cat: PricingCategorie, keuze: string | undefined): PricingMateriaal | "onbekend" | null {
  const id = geselecteerdeMateriaalId(cat.materialen, keuze);
  if (id === null) return null;
  return cat.materialen.find((m) => m.id === id) ?? "onbekend";
}

function leesHoeveelheid(od: PricingOnderdeel, inv: PricingOnderdeelInvoer, w: Waarschuwing[]): { qty: number; artikelen: SjabloonRegelResultaat[] } {
  const meld = (probleem: "ongeldig" | "negatief" | "te-groot" | null, wat: string) => {
    if (probleem === "te-groot") w.push({ code: "hoeveelheid-te-groot", onderdeelId: od.id, bericht: `${wat} bij ${od.naam} is onwaarschijnlijk groot en wordt begrensd.` });
    else if (probleem) w.push({ code: "ongeldige-invoer", onderdeelId: od.id, bericht: `${wat} bij ${od.naam} is ongeldig en telt als 0.` });
  };
  if (od.sjabloon.soort === "ENKELE_HOEVEELHEID") {
    const g = schoonGetal(inv.hoeveelheid);
    meld(g.probleem, "De hoeveelheid");
    return { qty: g.waarde, artikelen: [] };
  }
  try {
    const velden = klantVeldenVoorSjabloon(od.sjabloon.soort, od.sjabloon.config);
    const ruw = inv.invoer ?? {};
    const invoer = coerceVeldWaarden(velden, ruw);
    const res = berekenHoeveelheidVoorSjabloon(od.sjabloon.soort, od.sjabloon.config, invoer);
    if (res.soort === "hoeveelheid") {
      const g = schoonGetal(res.waarde);
      meld(g.probleem, "De afmetingen");
      return { qty: g.waarde, artikelen: [] };
    }
    const artikelen = res.regels
      .map((r) => ({ ...r, aantal: schoonGetal(r.aantal).waarde, prijsPerEenheid: schoonGetal(r.prijsPerEenheid, 1e9).waarde }))
      .filter((r) => r.aantal > 0);
    return { qty: artikelen.reduce((s, r) => s + r.aantal, 0), artikelen };
  } catch {
    w.push({ code: "ongeldige-invoer", onderdeelId: od.id, bericht: `De invoer bij ${od.naam} kon niet worden gelezen en telt als 0.` });
    return { qty: 0, artikelen: [] };
  }
}

type Kern = {
  onderdelen: OnderdeelUitkomst[];
  projectRegels: PrijsRegel[];
  waarschuwingen: Waarschuwing[];
  dagdelen: number;
  // Totaal incl. btw vóór een aanvulling tot het minimumtarief.
  voorAanvullingInclCenten: number;
  aanvullingCenten: number;
};

function rekenKern(config: PricingConfig, invoer: PricingInput, richting: Richting, locatie: LocatieBeoordeling): Kern {
  const t = config.tarieven;
  const btw = t.kor ? 0 : t.btwPercentage;
  const waarschuwingen: Waarschuwing[] = [];
  const onderdelen: OnderdeelUitkomst[] = [];
  const projectRegels: PrijsRegel[] = [];
  let dagdelen = 0;
  let vastTransport = 0;
  let vastVoorrij = 0;
  const perAanvraag = t.vasteKosten === "PER_AANVRAAG";

  const regel = (r: Omit<PrijsRegel, "bedragExclCenten" | "btwPercentage" | "btwCenten" | "bedragInclCenten"> & { bedrag: number }): PrijsRegel => {
    let bedrag = rondCenten(r.bedrag);
    if (bedrag > MAX_BEDRAG_CENTEN) {
      waarschuwingen.push({ code: "bedrag-te-groot", onderdeelId: r.onderdeelId ?? undefined, bericht: `Het bedrag van "${r.omschrijving}" is onwaarschijnlijk groot en wordt begrensd.` });
      bedrag = MAX_BEDRAG_CENTEN;
    }
    if (bedrag < 0) bedrag = 0;
    const { bedrag: _weg, ...rest } = r;
    void _weg;
    const tot = regelTotaal(bedrag, btw);
    return { ...rest, bedragExclCenten: bedrag, btwPercentage: btw, btwCenten: tot.btwCenten, bedragInclCenten: tot.inclCenten };
  };

  for (const od of config.onderdelen) {
    const inv = invoer.onderdelen[od.id];
    if (!inv) continue;
    const { qty, artikelen } = leesHoeveelheid(od, inv, waarschuwingen);
    if (qty <= 0 && artikelen.length === 0) continue;

    const regels: PrijsRegel[] = [];
    let primaireOptie: PricingMateriaal | undefined;

    // Materiaal: één regel per categorie, nooit alleen de eerste.
    od.categorieen.forEach((cat, index) => {
      const keuze = gekozenMateriaal(cat, inv.materialen[cat.id]);
      if (keuze === null) {
        if (cat.verplicht) waarschuwingen.push({ code: "ontbrekende-keuze", onderdeelId: od.id, bericht: `Bij ${od.naam} is voor ${cat.naam} nog niets gekozen.` });
        return;
      }
      if (keuze === "onbekend") {
        waarschuwingen.push({ code: "onbekende-keuze", onderdeelId: od.id, bericht: `Bij ${od.naam} is een materiaal gekozen dat niet (meer) bestaat voor ${cat.naam}.` });
        return;
      }
      if (index === 0) primaireOptie = keuze;
      if (!t.materiaalEnabled) return;
      const prijs = materiaalPrijs(keuze, richting, waarschuwingen, od.id);
      const effectief = keuze.stapgrootte && keuze.stapgrootte > 0 ? ceilStap(qty / keuze.stapgrootte) * keuze.stapgrootte : qty;
      if (prijs <= 0) waarschuwingen.push({ code: "ontbrekende-prijs", onderdeelId: od.id, bericht: `${keuze.naam} (${od.naam}) heeft nog geen prijs.` });
      regels.push(regel({ id: `${od.id}:materiaal:${cat.id}`, onderdeelId: od.id, soort: "materiaal", omschrijving: keuze.naam, categorie: cat.naam, aantal: effectief, eenheid: od.eenheid, prijsPerEenheidCenten: prijs, bedrag: effectief * prijs }));
    });

    // Extra's en toeslagen.
    if (t.materiaalEnabled) {
      for (const extra of od.extras) {
        const gekozen = extra.altijd ? 1 : schoonGetal(inv.extras[extra.id]).waarde;
        if (gekozen <= 0) continue;
        const aantal = extra.type === "PER_STUK" ? gekozen : qty;
        if (aantal <= 0) continue;
        if (extra.prijsCenten <= 0) waarschuwingen.push({ code: "ontbrekende-prijs", onderdeelId: od.id, bericht: `${extra.naam} (${od.naam}) heeft nog geen prijs.` });
        regels.push(regel({ id: `${od.id}:extra:${extra.id}`, onderdeelId: od.id, soort: "extra", omschrijving: extra.naam, aantal, eenheid: extra.type === "PER_STUK" ? "stuks" : od.eenheid, prijsPerEenheidCenten: extra.prijsCenten, bedrag: aantal * extra.prijsCenten }));
      }
      // Artikelregels (sjabloon "Per stuk"): elk artikeltype heeft een eigen prijs.
      artikelen.forEach((a, i) => {
        regels.push(regel({ id: `${od.id}:artikel:${i}`, onderdeelId: od.id, soort: "artikel", omschrijving: a.omschrijving, aantal: a.aantal, eenheid: "stuks", prijsPerEenheidCenten: a.prijsPerEenheid * 100, bedrag: a.aantal * a.prijsPerEenheid * 100 }));
      });
    }

    // Arbeid: hoeveelheid / werktempo × tarief; het werktempo van het gekozen materiaal gaat voor.
    const tempo = primaireOptie?.werktempoOverride ?? od.werktempo;
    const tarief = od.arbeidTariefOverrideCenten ?? t.arbeidTariefCenten;
    let ruweArbeidstijd = 0;
    let arbeidstijd = 0;
    if (t.arbeidEnabled) {
      if (tempo != null && tempo > 0) {
        ruweArbeidstijd = qty / tempo;
        arbeidstijd = t.arbeidAfronden ? ceilStap(ruweArbeidstijd) : ruweArbeidstijd;
        if (arbeidstijd > 0 && tarief > 0) {
          regels.push(regel({ id: `${od.id}:arbeid`, onderdeelId: od.id, soort: "arbeid", omschrijving: "Arbeid", aantal: arbeidstijd, eenheid: ARBEID_LABEL[t.arbeidEenheid], prijsPerEenheidCenten: tarief, bedrag: arbeidstijd * tarief }));
        }
        dagdelen += dagdelenVoorArbeid(arbeidstijd, t.arbeidEenheid);
      } else if (qty > 0) {
        waarschuwingen.push({ code: "geen-werktempo", onderdeelId: od.id, bericht: `Bij ${od.naam} staat geen werktempo. De arbeid telt niet mee.` });
      }
    }

    // Transport en voorrijkosten. Per dag: elke begonnen werkdag telt (minstens één).
    const dagen = ruweArbeidstijd > 0 ? Math.max(1, ceilStap(dagenVoorArbeid(ruweArbeidstijd, t.arbeidEenheid))) : 1;
    let transportDagen: number | null = null;
    if (t.transportEnabled) {
      const bedrag = od.transportOverrideCenten ?? t.transportTariefCenten;
      if (bedrag > 0) {
        if (od.transportPerDag) {
          transportDagen = ruweArbeidstijd > 0 ? dagen : null;
          regels.push(regel({ id: `${od.id}:transport`, onderdeelId: od.id, soort: "transport", omschrijving: "Transport", aantal: dagen, eenheid: "dag", prijsPerEenheidCenten: bedrag, bedrag: dagen * bedrag }));
        } else if (od.transportMeeschalend) {
          regels.push(regel({ id: `${od.id}:transport`, onderdeelId: od.id, soort: "transport", omschrijving: "Transport", aantal: qty, eenheid: od.eenheid, prijsPerEenheidCenten: bedrag, bedrag: qty * bedrag }));
        } else if (perAanvraag) {
          vastTransport = Math.max(vastTransport, bedrag);
        } else {
          regels.push(regel({ id: `${od.id}:transport`, onderdeelId: od.id, soort: "transport", omschrijving: "Transport", aantal: 1, eenheid: "post", prijsPerEenheidCenten: bedrag, bedrag }));
        }
      }
    }
    if (t.voorrijEnabled) {
      const bedrag = od.voorrijOverrideCenten ?? t.voorrijTariefCenten;
      if (bedrag > 0) {
        if (od.voorrijMeeschalend) {
          regels.push(regel({ id: `${od.id}:voorrijkosten`, onderdeelId: od.id, soort: "voorrijkosten", omschrijving: "Voorrijkosten", aantal: qty, eenheid: od.eenheid, prijsPerEenheidCenten: bedrag, bedrag: qty * bedrag }));
        } else if (perAanvraag) {
          vastVoorrij = Math.max(vastVoorrij, bedrag);
        } else {
          regels.push(regel({ id: `${od.id}:voorrijkosten`, onderdeelId: od.id, soort: "voorrijkosten", omschrijving: "Voorrijkosten", aantal: 1, eenheid: "post", prijsPerEenheidCenten: bedrag, bedrag }));
        }
      }
    }

    const kosten = leegKosten();
    for (const r of regels) kosten[r.soort] += r.bedragExclCenten;
    onderdelen.push({
      id: od.id,
      naam: od.naam,
      eenheid: od.eenheid,
      hoeveelheid: qty,
      regels,
      subtotaalExclCenten: regels.reduce((s, r) => s + r.bedragExclCenten, 0),
      kosten,
      arbeidstijd,
      transportDagen,
    });
  }

  if (onderdelen.length > 0) {
    if (vastVoorrij > 0) projectRegels.push(regel({ id: "project:voorrijkosten", onderdeelId: null, soort: "voorrijkosten", omschrijving: "Voorrijkosten", aantal: 1, eenheid: "post", prijsPerEenheidCenten: vastVoorrij, bedrag: vastVoorrij }));
    if (vastTransport > 0) projectRegels.push(regel({ id: "project:transport", onderdeelId: null, soort: "transport", omschrijving: "Transport", aantal: 1, eenheid: "post", prijsPerEenheidCenten: vastTransport, bedrag: vastTransport }));
    // Afstandstoeslag: een eigen projectregel, zodat de opbouw en de offerte hem netjes tonen.
    if (locatie.toeslag) {
      const t2 = locatie.toeslag;
      projectRegels.push(regel({ id: "project:afstand", onderdeelId: null, soort: "afstand", omschrijving: t2.omschrijving, aantal: t2.aantal, eenheid: t2.eenheid, prijsPerEenheidCenten: t2.prijsPerEenheidCenten, bedrag: t2.bedragCenten }));
    }
  }
  // Minimumtarief: een eigen correctieregel zodat het totaal precies op het minimumbedrag uitkomt.
  const voor = totalenVanRegels([...onderdelen.flatMap((o) => o.regels), ...projectRegels]).totaalInclCenten;
  const min = beoordeelMinimum(config.minimum, voor, onderdelen.length > 0);
  let aanvulling = 0;
  if (min.vulAan) {
    aanvulling = aanvullingTotMinimum(min.minimumInclCenten - voor, btw);
    if (aanvulling > 0) projectRegels.push(regel({ id: "project:minimum", onderdeelId: null, soort: "minimum", omschrijving: "Aanvulling tot minimumtarief", aantal: 1, eenheid: "post", prijsPerEenheidCenten: aanvulling, bedrag: aanvulling }));
  }
  return { onderdelen, projectRegels, waarschuwingen, dagdelen, voorAanvullingInclCenten: voor, aanvullingCenten: aanvulling };
}

function samenvattingVan(kern: Kern): Samenvatting {
  const regels = [...kern.onderdelen.flatMap((o) => o.regels), ...kern.projectRegels];
  const t = totalenVanRegels(regels);
  const kosten = leegKosten();
  for (const r of regels) kosten[r.soort] += r.bedragExclCenten;
  return { kosten, subtotaalExclCenten: t.subtotaalExclCenten, btwCenten: t.btwCenten, totaalInclCenten: t.totaalInclCenten };
}

export function berekenPrijs(config: PricingConfig, invoer: PricingInput): PricingResult {
  const t = config.tarieven;
  const locatie = beoordeelLocatie(config.werkgebied, invoer.locatie);
  const midden = rekenKern(config, invoer, "MIDDEN", locatie);
  const regels = [...midden.onderdelen.flatMap((o) => o.regels), ...midden.projectRegels];
  const totalen = totalenVanRegels(regels);
  const kosten = leegKosten();
  for (const r of regels) kosten[r.soort] += r.bedragExclCenten;
  const heeftSelectie = midden.onderdelen.length > 0;

  let bandbreedte: Bandbreedte | null = null;
  if (heeftSelectie && t.bandbreedte.modus === "PER_PRODUCT") {
    const min = samenvattingVan(rekenKern(config, invoer, "MIN", locatie));
    const max = samenvattingVan(rekenKern(config, invoer, "MAX", locatie));
    if (min.totaalInclCenten !== max.totaalInclCenten || min.subtotaalExclCenten !== max.subtotaalExclCenten) bandbreedte = { modus: "PER_PRODUCT", min, max };
  } else if (heeftSelectie && t.bandbreedte.modus === "TOTAAL") {
    const basis: Samenvatting = { kosten, subtotaalExclCenten: totalen.subtotaalExclCenten, btwCenten: totalen.btwCenten, totaalInclCenten: totalen.totaalInclCenten };
    // Bij een minimumtarief gaat de onderkant van de bandbreedte niet onder dat minimum.
    const ondergrens = config.minimum?.aan && config.minimum.gedrag === "TARIEF" ? config.minimum.bedragInclCenten : 0;
    const minIncl = Math.max(ondergrens, rondCenten(totalen.totaalInclCenten * (1 - t.bandbreedte.margeOmlaag / 100)));
    const maxIncl = rondCenten(totalen.totaalInclCenten * (1 + t.bandbreedte.margeOmhoog / 100));
    if (minIncl !== maxIncl) {
      bandbreedte = { modus: "TOTAAL", min: { ...basis, totaalInclCenten: minIncl }, max: { ...basis, totaalInclCenten: maxIncl }, margeOmlaag: t.bandbreedte.margeOmlaag, margeOmhoog: t.bandbreedte.margeOmhoog };
    }
  }

  const minimumBeoordeling = beoordeelMinimum(config.minimum, midden.voorAanvullingInclCenten, heeftSelectie);
  const flags: Markering[] = [];
  if (locatie.enabled && locatie.withinServiceArea === false && config.werkgebied?.buiten === "MARKEREN") flags.push("BUITEN_WERKGEBIED");
  if (locatie.enabled && locatie.withinServiceArea === "unknown") flags.push("WERKGEBIED_NIET_GECONTROLEERD");
  if (minimumBeoordeling.belowMinimum && config.minimum?.gedrag === "MARKEREN") flags.push("ONDER_MINIMUM");

  return {
    versie: 1,
    onderdelen: midden.onderdelen,
    projectRegels: midden.projectRegels,
    regels,
    kosten,
    subtotaalExclCenten: totalen.subtotaalExclCenten,
    btwGroepen: totalen.btwGroepen,
    btwCenten: totalen.btwCenten,
    totaalInclCenten: totalen.totaalInclCenten,
    kor: t.kor,
    btwPercentage: t.kor ? 0 : t.btwPercentage,
    bandbreedte,
    doorlooptijd: midden.dagdelen > 0 ? { dagdelen: midden.dagdelen, werkdagen: Math.max(1, ceilStap(midden.dagdelen / DAGDELEN_PER_DAG)) } : null,
    waarschuwingen: midden.waarschuwingen,
    heeftSelectie,
    serviceArea: { enabled: locatie.enabled, withinServiceArea: locatie.withinServiceArea, distanceKm: locatie.distanceKm, surchargeCenten: locatie.toeslag?.bedragCenten ?? 0, allowed: locatie.allowed, reason: locatie.reason },
    minimum: { enabled: minimumBeoordeling.enabled, belowMinimum: minimumBeoordeling.belowMinimum, minimumInclCenten: minimumBeoordeling.minimumInclCenten, topUpCenten: midden.aanvullingCenten, allowed: minimumBeoordeling.allowed },
    requestAllowed: locatie.allowed && minimumBeoordeling.allowed,
    flags,
  };
}
