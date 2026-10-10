import type {
  ArbeidStapEenheid,
  ExtraOption,
  MaterialCategory,
  MaterialOption,
  Product,
  ProductSjabloon,
} from "@/app/generated/prisma/client";
import { parseGetal } from "@/app/lib/sjablonen";

// Het nieuwe, simpele model van een werkzaamheid (= Product) voor het
// bewerkscherm en de aanmaak-wizard. Pure functies, geen database: de UI
// houdt een WerkzaamheidDraft bij, de server slaat 'm op (zie
// app/lib/actions/werkzaamheden.ts) en het live voorbeeld bouwt er een echt
// Product-achtig object van (bouwPreviewProduct) voor de echte rekenlogica.

export type Methode = "METER" | "M2" | "LENGTE_BREEDTE" | "STUK";

export const METHODE_OPTIES: { value: Methode; label: string; description: string }[] = [
  { value: "METER", label: "Per meter", description: "Schutting, haag, kantopsluiting" },
  { value: "M2", label: "Per m²", description: "Bestrating, gazon, kunstgras" },
  { value: "LENGTE_BREEDTE", label: "Lengte × breedte", description: "Klant vult beide maten in" },
  { value: "STUK", label: "Per stuk", description: "Bomen, lampen, plantenbakken" },
];

export function methodeLabel(m: Methode | null): string {
  return METHODE_OPTIES.find((o) => o.value === m)?.label ?? "Eigen instelling";
}

// Methode → bestaand sjabloon + eenheid (geen nieuwe rekenlogica).
export function methodeNaarInstelling(m: Methode): {
  sjabloon: ProductSjabloon;
  eenheid: string;
  sjabloonConfig: Record<string, unknown>;
} {
  switch (m) {
    case "METER":
      return { sjabloon: "ENKELE_HOEVEELHEID", eenheid: "m1", sjabloonConfig: {} };
    case "M2":
      return { sjabloon: "ENKELE_HOEVEELHEID", eenheid: "m2", sjabloonConfig: {} };
    case "LENGTE_BREEDTE":
      return { sjabloon: "AFMETINGEN", eenheid: "m2", sjabloonConfig: { metDiepte: false } };
    case "STUK":
      return { sjabloon: "ENKELE_HOEVEELHEID", eenheid: "stuks", sjabloonConfig: {} };
  }
}

// Omgekeerd: past een bestaand product binnen de vier methodes? Zo niet
// (RUIMTES, ARTIKELREGELS, m³, eigen eenheid, …) geeft dit null — dan toont
// het scherm "Eigen instelling" en blijft alles onaangeroerd.
export function methodeVanProduct(p: {
  sjabloon: ProductSjabloon;
  eenheid: string;
  sjabloonConfig: unknown;
}): Methode | null {
  if (p.sjabloon === "ENKELE_HOEVEELHEID") {
    if (p.eenheid === "m1") return "METER";
    if (p.eenheid === "m2") return "M2";
    if (p.eenheid === "stuks") return "STUK";
    return null;
  }
  if (p.sjabloon === "AFMETINGEN" && p.eenheid === "m2") {
    const config = (p.sjabloonConfig as { metDiepte?: boolean } | null) ?? {};
    return config.metDiepte ? null : "LENGTE_BREEDTE";
  }
  return null;
}

// Eenheid zoals een hovenier 'm leest: "m", "m²", "stuk".
export function kortEenheid(eenheid: string): string {
  if (eenheid === "m1") return "m";
  if (eenheid === "m2") return "m²";
  if (eenheid === "m3") return "m³";
  if (eenheid === "stuks") return "stuk";
  return eenheid;
}

// Hoeveelheid voor het "20 m² kost je klant €X"-voorbeeld.
export function voorbeeldHoeveelheidVoor(eenheid: string): number {
  return eenheid === "stuks" ? 1 : 20;
}

export const STAP_WOORD: Record<ArbeidStapEenheid, { enkelvoud: string; vraag: string }> = {
  DAGDEEL: { enkelvoud: "dagdeel", vraag: "in een dagdeel" },
  DAG: { enkelvoud: "dag", vraag: "op een dag" },
  UUR: { enkelvoud: "uur", vraag: "in een uur" },
};

export function arbeidVraag(naam: string, eenheid: string, stap: ArbeidStapEenheid): string {
  const werk = naam.trim() === "" ? "dit werk" : naam.trim().toLowerCase();
  return `Hoeveel ${kortEenheid(eenheid)} ${werk} maak je ${STAP_WOORD[stap].vraag}?`;
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export type MateriaalRij = {
  sleutel: string;
  id?: string;
  naam: string;
  prijs: string;
  prijsMin: string;
  prijsMax: string;
  productiviteitOverride: string;
  isVoorbeeld: boolean;
};

// Extra vraag aan de klant (ja/nee met meerprijs) of toeslag (altijd van
// toepassing): beide leven als ExtraOption.
export type ExtraRij = {
  sleutel: string;
  id?: string;
  naam: string;
  prijs: string;
  type: "PER_EENHEID" | "PER_STUK";
  altijd: boolean;
};

export type WerkzaamheidDraft = {
  naam: string;
  methode: Methode | null;
  productiviteit: string;
  transportPerDag: boolean;
  bandbreedte: boolean;
  werktempoPerMateriaal: boolean;
  materialen: MateriaalRij[];
  // Optioneel: ontbreekt = extra's niet aanraken bij opslaan.
  extras?: ExtraRij[];
};

export type ProductMetRelaties = Product & {
  materiaalCategorieen: (MaterialCategory & { materialen: MaterialOption[] })[];
  extraOpties: ExtraOption[];
};

let teller = 0;
// Uniek binnen en tussen sessies: een concept uit de browser kan sleutels van
// een eerdere sessie bevatten, dus alleen een teller zou botsen.
const sessieTag = Math.random().toString(36).slice(2, 6);
export const nieuweSleutel = () => `nieuw-${sessieTag}-${++teller}`;

export function legeRij(): MateriaalRij {
  return {
    sleutel: nieuweSleutel(),
    naam: "",
    prijs: "",
    prijsMin: "",
    prijsMax: "",
    productiviteitOverride: "",
    isVoorbeeld: false,
  };
}

const naarTekst = (n: number | null | undefined) => (n == null ? "" : String(n));

export function legeExtra(altijd: boolean): ExtraRij {
  return { sleutel: nieuweSleutel(), naam: "", prijs: "", type: altijd ? "PER_STUK" : "PER_STUK", altijd };
}

export function draftVanProduct(product: ProductMetRelaties): WerkzaamheidDraft {
  const eerste = product.materiaalCategorieen[0];
  const materialen = (eerste?.materialen ?? []).map<MateriaalRij>((m) => ({
    // Stabiel (= database-id) zodat server en client dezelfde sleutel/DOM-id
    // renderen; alleen nieuwe regels krijgen een teller (pas bij een klik).
    sleutel: m.id,
    id: m.id,
    naam: m.naam,
    prijs: String(m.prijs),
    prijsMin: naarTekst(m.prijsMin ?? m.prijs),
    prijsMax: naarTekst(m.prijsMax ?? m.prijs),
    productiviteitOverride: naarTekst(m.productiviteitOverride),
    isVoorbeeld: m.isVoorbeeld,
  }));
  return {
    naam: product.naam,
    methode: methodeVanProduct(product),
    productiviteit: naarTekst(product.productiviteit),
    transportPerDag: product.transportPerDag,
    bandbreedte: (eerste?.materialen ?? []).some((m) => m.prijsType === "BANDBREEDTE"),
    werktempoPerMateriaal: (eerste?.materialen ?? []).some((m) => m.productiviteitOverride != null),
    materialen,
    extras: product.extraOpties.map<ExtraRij>((e) => ({
      sleutel: e.id,
      id: e.id,
      naam: e.naam,
      prijs: String(e.prijs),
      type: e.type,
      altijd: e.altijd,
    })),
  };
}

// "Geavanceerd" staat open zodra er al iets aan staat.
export function heeftGeavanceerdeInstellingen(d: WerkzaamheidDraft, product?: ProductMetRelaties): boolean {
  return (
    d.bandbreedte ||
    d.werktempoPerMateriaal ||
    d.transportPerDag ||
    (product?.extraOpties.length ?? 0) > 0
  );
}

// Is dit werk volledig te tonen in de vier methodes + één materialenlijst?
// Zo niet, dan blijven de extra instellingen (sjabloon, afwijkende tarieven,
// meerdere materiaalgroepen) onaangeroerd en wijst het scherm naar de
// uitgebreide weergave.
export function bestaandeExtras(product: ProductMetRelaties): string[] {
  const extras: string[] = [];
  if (methodeVanProduct(product) === null) extras.push("een eigen manier van rekenen");
  if (product.materiaalCategorieen.length > 1) extras.push("meerdere materiaalgroepen");
  if (product.arbeidTariefOverride != null) extras.push("een eigen arbeidstarief");
  if (product.transportkostenOverride != null) extras.push("eigen transportkosten");
  if (product.voorrijkostenOverride != null) extras.push("eigen voorrijkosten");
  if (product.transportMeeschalend || product.voorrijMeeschalend) extras.push("kosten die meeschalen");
  if (product.materiaalCategorieen[0]?.materialen.some((m) => m.stapgrootte != null)) extras.push("een stapgrootte");
  return extras;
}

export type RijFout = { sleutel: string; veld: "naam" | "prijs" | "prijsMin" | "prijsMax" | "tempo"; melding: string };

export function valideerMaterialen(d: WerkzaamheidDraft): RijFout[] {
  const fouten: RijFout[] = [];
  for (const r of d.materialen) {
    if (r.naam.trim() === "") fouten.push({ sleutel: r.sleutel, veld: "naam", melding: "Geef het materiaal een naam." });
    const check = (veld: "prijs" | "prijsMin" | "prijsMax", waarde: string) => {
      const getal = parseGetal(waarde, NaN);
      if (Number.isNaN(getal) || getal < 0) {
        fouten.push({ sleutel: r.sleutel, veld, melding: "Vul een prijs in." });
      }
    };
    if (d.bandbreedte) {
      check("prijsMin", r.prijsMin);
      check("prijsMax", r.prijsMax);
      if (parseGetal(r.prijsMin, 0) > parseGetal(r.prijsMax, 0)) {
        fouten.push({ sleutel: r.sleutel, veld: "prijsMax", melding: "De hoogste prijs moet hoger zijn dan de laagste." });
      }
    } else {
      check("prijs", r.prijs);
    }
    if (d.werktempoPerMateriaal && r.productiviteitOverride.trim() !== "") {
      if (!(parseGetal(r.productiviteitOverride, NaN) > 0)) {
        fouten.push({ sleutel: r.sleutel, veld: "tempo", melding: "Vul een getal groter dan 0 in." });
      }
    }
  }
  return fouten;
}

export type ExtraFout = { sleutel: string; veld: "naam" | "prijs"; melding: string };

export function valideerExtras(d: WerkzaamheidDraft): ExtraFout[] {
  const fouten: ExtraFout[] = [];
  for (const e of d.extras ?? []) {
    if (e.naam.trim() === "") {
      fouten.push({ sleutel: e.sleutel, veld: "naam", melding: e.altijd ? "Geef de toeslag een naam." : "Geef de vraag een naam." });
    }
    const prijs = parseGetal(e.prijs, NaN);
    if (Number.isNaN(prijs) || prijs < 0) {
      fouten.push({ sleutel: e.sleutel, veld: "prijs", melding: "Vul een bedrag in (0 mag ook)." });
    }
  }
  return fouten;
}

// Kan opgeslagen worden? (minstens één materiaal, geen foutieve regels, naam)
export function draftIsGeldig(d: WerkzaamheidDraft): boolean {
  return (
    d.naam.trim() !== "" &&
    d.materialen.length > 0 &&
    valideerMaterialen(d).length === 0 &&
    valideerExtras(d).length === 0
  );
}

// Wizard stap 2 is geldig met een naam, een methode en geldige materialen.
export function stap2IsGeldig(d: WerkzaamheidDraft): boolean {
  return draftIsGeldig(d) && d.methode !== null;
}

export function heeftProductiviteit(d: WerkzaamheidDraft): boolean {
  return parseGetal(d.productiviteit, 0) > 0;
}

// ---------------------------------------------------------------------------
// Preview-product voor de echte klant-rekentool en rekenlogica
// ---------------------------------------------------------------------------

export type PreviewProduct = ProductMetRelaties;

function basisProduct(toolId: string): Product {
  const nu = new Date(0);
  return {
    id: "voorbeeld-product",
    toolId,
    naam: "",
    omschrijving: null,
    eenheid: "m2",
    productiviteit: null,
    arbeidTariefOverride: null,
    transportkostenOverride: null,
    transportMeeschalend: false,
    transportPerDag: false,
    voorrijkostenOverride: null,
    voorrijMeeschalend: false,
    icoon: null,
    actief: true,
    order: 0,
    sjabloon: "ENKELE_HOEVEELHEID",
    sjabloonConfig: {},
    createdAt: nu,
    updatedAt: nu,
  } as Product;
}

function previewExtras(draft: WerkzaamheidDraft, origineel: ProductMetRelaties | null): ExtraOption[] {
  // Zonder extras in de draft: de bestaande (actieve) extra's ongewijzigd.
  if (!draft.extras) return (origineel?.extraOpties ?? []).filter((e) => e.actief);
  const oud = new Map((origineel?.extraOpties ?? []).map((e) => [e.id, e]));
  return draft.extras.map<ExtraOption>((r, i) => {
    const bestaand = r.id ? oud.get(r.id) : undefined;
    return {
      id: r.id ?? `voorbeeld-extra-${r.sleutel}`,
      productId: origineel?.id ?? "voorbeeld-product",
      naam: r.naam,
      omschrijving: bestaand?.omschrijving ?? null,
      prijs: parseGetal(r.prijs, 0),
      type: r.type,
      altijd: r.altijd,
      foto: bestaand?.foto ?? null,
      actief: bestaand?.actief ?? true,
      order: i,
      createdAt: bestaand?.createdAt ?? new Date(0),
    };
  }).filter((e) => e.actief);
}

export function bouwPreviewProduct({
  toolId,
  draft,
  origineel,
  icoon,
  omschrijving,
}: {
  toolId: string;
  draft: WerkzaamheidDraft;
  origineel?: ProductMetRelaties | null;
  icoon?: string | null;
  omschrijving?: string | null;
}): PreviewProduct {
  const basis: Product = origineel ?? basisProduct(toolId);
  const instelling = draft.methode ? methodeNaarInstelling(draft.methode) : null;
  const product: Product = {
    ...basis,
    naam: draft.naam,
    omschrijving: omschrijving !== undefined ? omschrijving : basis.omschrijving,
    icoon: icoon !== undefined ? icoon : basis.icoon,
    sjabloon: instelling ? instelling.sjabloon : basis.sjabloon,
    eenheid: instelling ? instelling.eenheid : basis.eenheid,
    sjabloonConfig: (instelling ? instelling.sjabloonConfig : basis.sjabloonConfig) as Product["sjabloonConfig"],
    productiviteit: heeftProductiviteit(draft) ? parseGetal(draft.productiviteit, 0) : null,
    transportPerDag: draft.transportPerDag,
  };

  const eersteCategorie = origineel?.materiaalCategorieen[0];
  const origineleOpties = new Map((eersteCategorie?.materialen ?? []).map((m) => [m.id, m]));
  const nu = new Date(0);
  const materialen = draft.materialen.map<MaterialOption>((r, i) => {
    const oud = r.id ? origineleOpties.get(r.id) : undefined;
    const min = parseGetal(r.prijsMin, 0);
    const max = parseGetal(r.prijsMax, 0);
    return {
      id: r.id ?? `voorbeeld-${r.sleutel}`,
      materialCategoryId: eersteCategorie?.id ?? "voorbeeld-categorie",
      naam: r.naam,
      prijs: draft.bandbreedte ? min : parseGetal(r.prijs, 0),
      prijsType: draft.bandbreedte ? "BANDBREEDTE" : "VAST",
      prijsMin: draft.bandbreedte ? min : null,
      prijsMax: draft.bandbreedte ? max : null,
      stapgrootte: oud?.stapgrootte ?? null,
      productiviteitOverride:
        draft.werktempoPerMateriaal && parseGetal(r.productiviteitOverride, 0) > 0
          ? parseGetal(r.productiviteitOverride, 0)
          : null,
      foto: oud?.foto ?? null,
      actief: oud?.actief ?? true,
      isVoorbeeld: r.isVoorbeeld,
      order: i,
      createdAt: oud?.createdAt ?? nu,
    };
  });

  const categorie: MaterialCategory & { materialen: MaterialOption[] } = {
    id: eersteCategorie?.id ?? "voorbeeld-categorie",
    productId: product.id,
    naam: eersteCategorie?.naam ?? "Materiaal",
    order: 0,
    verplicht: eersteCategorie?.verplicht ?? true,
    createdAt: eersteCategorie?.createdAt ?? nu,
    // Alleen actieve opties zijn voor de klant zichtbaar.
    materialen: materialen.filter((m) => m.actief),
  };

  return {
    ...product,
    materiaalCategorieen: [categorie, ...(origineel?.materiaalCategorieen.slice(1) ?? [])],
    extraOpties: previewExtras(draft, origineel ?? null),
  };
}

// ---------------------------------------------------------------------------
// Geavanceerd: bandbreedte aan/uit
// ---------------------------------------------------------------------------

const rond2 = (n: number) => Math.round(n * 100) / 100;

// Aanzetten: elke vaste prijs wordt een bandbreedte van −10% tot +10%.
// Uitzetten: terug naar één prijs, het midden van de bandbreedte.
export function zetBandbreedte(d: WerkzaamheidDraft, aan: boolean): WerkzaamheidDraft {
  if (aan === d.bandbreedte) return d;
  return {
    ...d,
    bandbreedte: aan,
    materialen: d.materialen.map((r) => {
      if (aan) {
        const prijs = parseGetal(r.prijs, 0);
        return { ...r, prijsMin: String(rond2(prijs * 0.9)), prijsMax: String(rond2(prijs * 1.1)) };
      }
      const midden = (parseGetal(r.prijsMin, 0) + parseGetal(r.prijsMax, 0)) / 2;
      return { ...r, prijs: String(rond2(midden)) };
    }),
  };
}
