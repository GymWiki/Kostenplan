import { KNOP_POSITIES, PLAATSINGEN, WEERGAVEN, type KnopPositie, type Plaatsing, type Weergave } from "./config";

// Wat een embed (de code op de site van de hovenier) kan instellen, bovenop de instellingen van de rekentool zelf:
// een variant per plek op de site. De code zet dit als data-attributen; het laadscript geeft weergave, onderdelen en
// deep link door aan /embed/<toolId> als parameters. Alles wat daar binnenkomt wordt gecontroleerd tegen vaste lijsten.

export type EmbedVariant = {
  weergave?: Weergave;
  plaatsing?: Plaatsing;
  knopTekst?: string;
  knopPositie?: KnopPositie;
  // Alleen deze onderdelen (id's). Eén onderdeel = direct de configurator, zonder raster of eerste stap.
  onderdelen?: string[];
};

export const MAX_VARIANT_ONDERDELEN = 50;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

// Zo staat een onderdeel in een deep link: "Bestrating / terras" → "bestrating-terras".
export function slugVan(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Zoek het onderdeel bij een deep link: op id, anders op de slug van de naam (eerste treffer).
export function vindOnderdeel(producten: readonly { id: string; naam: string }[], sleutel: string | null | undefined): string | null {
  if (!sleutel) return null;
  const s = sleutel.trim();
  if (!s) return null;
  const opId = producten.find((p) => p.id === s);
  if (opId) return opId.id;
  const slug = slugVan(s);
  return slug ? producten.find((p) => slugVan(p.naam) === slug)?.id ?? null : null;
}

export type EmbedParams = { weergave?: Weergave; onderdelen?: string[]; open?: string; popup: boolean };

const eerste = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// De parameters van /embed/<toolId>?…: onbekende of ongeldige waarden worden genegeerd.
export function parseEmbedParams(sp: Record<string, string | string[] | undefined>): EmbedParams {
  const w = eerste(sp.weergave);
  const weergave = (WEERGAVEN as readonly string[]).includes(w ?? "") ? (w as Weergave) : undefined;
  const lijst = (eerste(sp.onderdelen) ?? "").split(",").map((x) => x.trim()).filter((x) => ID.test(x));
  const onderdelen = lijst.length > 0 ? [...new Set(lijst)].slice(0, MAX_VARIANT_ONDERDELEN) : undefined;
  const open = eerste(sp.open)?.trim();
  return { weergave, onderdelen, open: open && /^[A-Za-z0-9_-]{1,60}$/.test(open) ? open : undefined, popup: eerste(sp.modus) === "popup" };
}

export function varianteHeeftOpties(v: EmbedVariant | undefined): boolean {
  return Boolean(v && (v.weergave || v.plaatsing || v.knopTekst || v.knopPositie || (v.onderdelen && v.onderdelen.length > 0)));
}

// Geldige waarden uit een variant (bijv. van de editor); de rest valt weg.
export function zuiverVariant(v: EmbedVariant | undefined): EmbedVariant {
  if (!v) return {};
  return {
    ...(v.weergave && (WEERGAVEN as readonly string[]).includes(v.weergave) ? { weergave: v.weergave } : {}),
    ...(v.plaatsing && (PLAATSINGEN as readonly string[]).includes(v.plaatsing) ? { plaatsing: v.plaatsing } : {}),
    ...(v.knopPositie && (KNOP_POSITIES as readonly string[]).includes(v.knopPositie) ? { knopPositie: v.knopPositie } : {}),
    ...(v.knopTekst?.trim() ? { knopTekst: v.knopTekst.trim().slice(0, 40) } : {}),
    ...(v.onderdelen?.length ? { onderdelen: [...new Set(v.onderdelen.filter((x) => ID.test(x)))].slice(0, MAX_VARIANT_ONDERDELEN) } : {}),
  };
}
