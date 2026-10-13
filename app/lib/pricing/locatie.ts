import { rondKm } from "@/app/lib/werkgebied/afstand";
import { postcodeCijfers, postcodeInReeksen } from "@/app/lib/werkgebied/postcodes";
import { rondCenten } from "./rond";
import { regelTotaal } from "./totalen";
import type { LocatieInvoer, MinimumConfig, WerkgebiedConfig } from "./schema";

// De regels voor werkgebied en minimale opdracht, zonder opzoeken: de afstand (of postcode) komt van buiten,
// dit bepaalt alleen wat het betekent. Puur en deterministisch, dus gelijk in de browser en op de server.

export type Reden = "outside" | "zone-not-possible";

export type LocatieBeoordeling = {
  enabled: boolean;
  withinServiceArea: boolean | "unknown";
  distanceKm: number | null;
  // Afstandstoeslag als projectregel (excl. btw); null als er geen toeslag is.
  toeslag: { omschrijving: string; aantal: number; eenheid: string; prijsPerEenheidCenten: number; bedragCenten: number } | null;
  allowed: boolean;
  reason: Reden | null;
};

export const UIT: LocatieBeoordeling = { enabled: false, withinServiceArea: "unknown", distanceKm: null, toeslag: null, allowed: true, reason: null };

const kmTekst = (km: number) => String(rondKm(km)).replace(".", ",");

export function beoordeelLocatie(wg: WerkgebiedConfig | null | undefined, locatie: LocatieInvoer | undefined): LocatieBeoordeling {
  if (!wg || !wg.aan) return UIT;

  let binnen: boolean | "unknown" = "unknown";
  let afstand: number | null = null;

  if (wg.methode === "POSTCODES") {
    const vier = locatie?.postcode ? postcodeCijfers(locatie.postcode) : null;
    if (vier !== null) binnen = postcodeInReeksen(vier, wg.reeksen);
  } else if (locatie && locatie.afstandKm !== null && Number.isFinite(locatie.afstandKm) && locatie.afstandKm >= 0) {
    afstand = rondKm(locatie.afstandKm);
    // De afstand wordt op een tiende km getoond en gerekend; precies op de grens valt nog binnen het werkgebied.
    binnen = afstand <= wg.straalKm;
  }

  // Zonder bruikbaar adres of afstand blokkeren we nooit: de aanvraag mag door, gemarkeerd als niet gecontroleerd.
  if (binnen === "unknown") return { enabled: true, withinServiceArea: "unknown", distanceKm: afstand, toeslag: null, allowed: true, reason: null };

  let toeslag: LocatieBeoordeling["toeslag"] = null;
  let allowed = true;
  let reason: Reden | null = null;

  if (wg.buiten === "TOESLAG" && wg.methode === "STRAAL" && afstand !== null) {
    if (wg.toeslag.modus === "PER_KM") {
      const extra = Math.max(0, rondKm(afstand - wg.straalKm));
      const bedrag = rondCenten(extra * wg.toeslag.perKmCenten);
      if (!binnen && bedrag > 0) toeslag = { omschrijving: `Voorrijkosten extra afstand (${kmTekst(afstand)} km)`, aantal: extra, eenheid: "km", prijsPerEenheidCenten: wg.toeslag.perKmCenten, bedragCenten: bedrag };
    } else {
      const zone = wg.toeslag.zones.find((z) => z.totKm === null || afstand <= z.totKm);
      if (zone) {
        if (zone.bedragCenten === null) {
          allowed = false;
          reason = "zone-not-possible";
        } else if (zone.bedragCenten > 0) {
          toeslag = { omschrijving: `Voorrijkosten extra afstand (${kmTekst(afstand)} km)`, aantal: 1, eenheid: "post", prijsPerEenheidCenten: zone.bedragCenten, bedragCenten: rondCenten(zone.bedragCenten) };
        }
      }
    }
  } else if (binnen === false && wg.buiten === "GEEN_AANVRAAG") {
    allowed = false;
    reason = "outside";
  }

  return { enabled: true, withinServiceArea: binnen, distanceKm: afstand, toeslag, allowed, reason };
}

// De aanvulling (excl. btw) waarmee het totaal incl. btw op het minimumbedrag uitkomt. Door het afronden van
// de btw per regel past niet elk bedrag exact; dan wordt het kleinste bedrag genomen dat er net boven zit.
export function aanvullingTotMinimum(tekortInclCenten: number, btwPercentage: number): number {
  if (tekortInclCenten <= 0) return 0;
  const start = Math.max(0, rondCenten((tekortInclCenten * 100) / (100 + btwPercentage)) - 2);
  let beste = start;
  for (let x = start; x <= start + 6; x++) {
    if (regelTotaal(x, btwPercentage).inclCenten >= tekortInclCenten) {
      beste = x;
      break;
    }
  }
  return beste;
}

export type MinimumBeoordeling = { enabled: boolean; belowMinimum: boolean; minimumInclCenten: number; allowed: boolean; vulAan: boolean };

export function beoordeelMinimum(min: MinimumConfig | null | undefined, totaalInclCenten: number, heeftSelectie: boolean): MinimumBeoordeling {
  if (!min || !min.aan || !(min.bedragInclCenten > 0)) return { enabled: false, belowMinimum: false, minimumInclCenten: 0, allowed: true, vulAan: false };
  const onder = heeftSelectie && totaalInclCenten < min.bedragInclCenten;
  return { enabled: true, belowMinimum: onder, minimumInclCenten: min.bedragInclCenten, allowed: !(onder && min.gedrag === "GEEN_AANVRAAG"), vulAan: onder && min.gedrag === "TARIEF" };
}
