import { nieuwId, type OfferteInhoud, type OfferteRegel, type OfferteSectie } from "./model";
import { btwVoorSoort, type RegelSoort } from "./btw-config";

// Pure bewerkingen op de inhoud van een offerte (editor en tests).

const verplaats = <T,>(lijst: T[], van: number, naar: number): T[] => {
  if (naar < 0 || naar >= lijst.length || van === naar) return lijst;
  const kopie = [...lijst];
  const [x] = kopie.splice(van, 1);
  kopie.splice(naar, 0, x);
  return kopie;
};

export const nieuweRegel = (soort: RegelSoort = "overig", btwStandaard?: Partial<Record<RegelSoort, number>> | null, extra: Partial<OfferteRegel> = {}): OfferteRegel => ({
  id: nieuwId(),
  type: "normaal",
  omschrijving: "",
  aantal: 1,
  eenheid: "post",
  prijsCenten: 0,
  btw: btwVoorSoort(soort, btwStandaard),
  soort,
  ...extra,
});

export function wijzigRegel(i: OfferteInhoud, sectieId: string, regelId: string, patch: Partial<OfferteRegel>): OfferteInhoud {
  return { ...i, secties: i.secties.map((s) => (s.id === sectieId ? { ...s, regels: s.regels.map((r) => (r.id === regelId ? { ...r, ...patch } : r)) } : s)) };
}
export const voegRegelToe = (i: OfferteInhoud, sectieId: string, regel: OfferteRegel): OfferteInhoud => ({ ...i, secties: i.secties.map((s) => (s.id === sectieId ? { ...s, regels: [...s.regels, regel] } : s)) });
export const verwijderRegel = (i: OfferteInhoud, sectieId: string, regelId: string): OfferteInhoud => ({ ...i, secties: i.secties.map((s) => (s.id === sectieId ? { ...s, regels: s.regels.filter((r) => r.id !== regelId) } : s)) });
export function dupliceerRegel(i: OfferteInhoud, sectieId: string, regelId: string): { inhoud: OfferteInhoud; nieuweId: string | null } {
  let nieuw: string | null = null;
  const secties = i.secties.map((s) => {
    if (s.id !== sectieId) return s;
    const idx = s.regels.findIndex((r) => r.id === regelId);
    if (idx < 0) return s;
    const kopie = { ...s.regels[idx], id: nieuwId() };
    nieuw = kopie.id;
    return { ...s, regels: [...s.regels.slice(0, idx + 1), kopie, ...s.regels.slice(idx + 1)] };
  });
  return { inhoud: { ...i, secties }, nieuweId: nieuw };
}
export function verplaatsRegel(i: OfferteInhoud, sectieId: string, regelId: string, richting: -1 | 1): OfferteInhoud {
  return { ...i, secties: i.secties.map((s) => (s.id === sectieId ? { ...s, regels: verplaats(s.regels, s.regels.findIndex((r) => r.id === regelId), s.regels.findIndex((r) => r.id === regelId) + richting) } : s)) };
}
// Verplaats een regel naar een andere sectie (sleep tussen secties of via het paneel).
export function verplaatsRegelNaarSectie(i: OfferteInhoud, regelId: string, naarSectieId: string): OfferteInhoud {
  let regel: OfferteRegel | undefined;
  const zonder = i.secties.map((s) => {
    const r = s.regels.find((x) => x.id === regelId);
    if (r) regel = r;
    return r ? { ...s, regels: s.regels.filter((x) => x.id !== regelId) } : s;
  });
  if (!regel) return i;
  return { ...i, secties: zonder.map((s) => (s.id === naarSectieId ? { ...s, regels: [...s.regels, regel!] } : s)) };
}

export const voegSectieToe = (i: OfferteInhoud, titel = "Nieuwe sectie"): { inhoud: OfferteInhoud; id: string } => {
  const s: OfferteSectie = { id: nieuwId("s"), titel, regels: [] };
  return { inhoud: { ...i, secties: [...i.secties, s] }, id: s.id };
};
export const wijzigSectieTitel = (i: OfferteInhoud, id: string, titel: string): OfferteInhoud => ({ ...i, secties: i.secties.map((s) => (s.id === id ? { ...s, titel } : s)) });
export const verwijderSectie = (i: OfferteInhoud, id: string): OfferteInhoud => ({ ...i, secties: i.secties.filter((s) => s.id !== id) });
export function verplaatsSectie(i: OfferteInhoud, id: string, richting: -1 | 1): OfferteInhoud {
  const idx = i.secties.findIndex((s) => s.id === id);
  return { ...i, secties: verplaats(i.secties, idx, idx + richting) };
}
export function dupliceerSectie(i: OfferteInhoud, id: string): { inhoud: OfferteInhoud; id: string | null } {
  const idx = i.secties.findIndex((s) => s.id === id);
  if (idx < 0) return { inhoud: i, id: null };
  const kopie: OfferteSectie = { ...i.secties[idx], id: nieuwId("s"), titel: `${i.secties[idx].titel} (kopie)`, regels: i.secties[idx].regels.map((r) => ({ ...r, id: nieuwId() })) };
  return { inhoud: { ...i, secties: [...i.secties.slice(0, idx + 1), kopie, ...i.secties.slice(idx + 1)] }, id: kopie.id };
}

// Wisselt van klanttype: herroepingsrecht staat standaard aan voor particulieren.
export function zetKlantType(i: OfferteInhoud, type: "particulier" | "zakelijk"): OfferteInhoud {
  return { ...i, klant: { ...i.klant, type }, herroeping: { ...i.herroeping, aan: type === "particulier" ? true : false } };
}
