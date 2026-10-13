import { creditnotaUitFactuur, eenFactuurUitOfferte, eindfactuurUitOfferte, termijnFactuurUitOfferte, voegMeerwerkToe, type OfferteBron } from "./maak";
import { regel } from "./test-helpers";
import { factuurInhoud } from "./test-helpers";
import type { FactuurInhoud } from "./model";
import type { OfferteInhoud, OfferteRegel } from "@/app/lib/offerte/model";

// Voorbeeldfacturen voor de PR en de schermtests (alleen bereikbaar met OFFERTE_VOORBEELDEN=1, net als de voorbeeldofferte).
const NU = new Date("2026-10-26T10:00:00Z");
const inst = { betaaltermijnDagen: 14, nu: NU };

function bron(opties: { zakelijk?: boolean; kor?: boolean; regels?: OfferteRegel[] } = {}): OfferteBron {
  const regels = opties.regels ?? [
    regel("a", "Bestrating terras, gebakken klinkers", 24, 7345, 21, { eenheid: "m²", soort: "materiaal" }),
    regel("b", "Arbeid bestrating (dagdelen)", 6, 21000, 21, { eenheid: "dagdeel", soort: "arbeid" }),
    regel("c", "Haag planten, Carpinus betulus", 17, 1899, 9, { eenheid: "stuks", soort: "planten" }),
    { ...regel("d", "Grondwerk en afvoer", 1, 40000, 21), type: "stelpost" },
  ];
  const inhoud = { ...factuurInhoud({ zakelijk: opties.zakelijk, kor: opties.kor }), nummer: "2026-0012", secties: [{ id: "s1", titel: "Tuin Kerkstraat 5", regels }], betaaltermijnen: [{ label: "Aanbetaling", percentage: 30 }, { label: "Bij oplevering", percentage: 70 }] } as OfferteInhoud;
  return { inhoud, gekozenOptioneel: [], nummer: "2026-0012", versie: 1 };
}

const klaar = (f: FactuurInhoud, nummer: string): FactuurInhoud => ({
  ...f,
  nummer,
  factuur: { ...f.factuur, nummer, uitvoeringVan: f.factuur.uitvoeringVan || "2026-10-22", factuurdatum: "2026-10-26", vervaldatum: f.factuur.soort === "creditnota" ? "2026-10-26" : "2026-11-09" },
  datum: "2026-10-26",
  geldigTot: f.factuur.soort === "creditnota" ? "2026-10-26" : "2026-11-09",
  secties: f.secties.map((s) => ({ ...s, regels: s.regels.map((r) => (r.label === "stelpost-open" ? { ...r, aantal: 1.5, label: undefined, toelichting: "Werkelijke hoeveelheid (nacalculatie)" } : r)) })),
});

const particulier = () => klaar(eenFactuurUitOfferte(bron(), inst), "F2026-0007");

export const VOORBEELD_FACTUREN = {
  "factuur-particulier": particulier,
  "factuur-verlegd": () => {
    const f = klaar(eenFactuurUitOfferte(bron({ zakelijk: true }), inst), "F2026-0008");
    return { ...f, factuur: { ...f.factuur, btwModus: "verlegd" as const, klantBtwId: "NL987654321B01" } };
  },
  "factuur-kor": () => klaar(eenFactuurUitOfferte(bron({ kor: true }), inst), "F2026-0009"),
  "factuur-termijn": () => klaar(termijnFactuurUitOfferte(bron(), { label: "Aanbetaling", percentage: 30 }, inst), "F2026-0010"),
  "factuur-eind": () => {
    const b = bron();
    const t = klaar(termijnFactuurUitOfferte(b, { label: "Aanbetaling", percentage: 30 }, inst), "F2026-0010");
    const eind = eindfactuurUitOfferte(b, [{ nummer: "F2026-0010", inhoud: t }], inst);
    return voegMeerwerkToe(klaar(eind, "F2026-0011"), { omschrijving: "Extra afvoer grond", aantal: 3, eenheid: "m³", prijsCenten: 4500, btw: 21, notitie: "Akkoord klant op 14-10" });
  },
  "creditnota": () => klaar(creditnotaUitFactuur({ nummer: "F2026-0007", inhoud: particulier() }, inst, ["a", "b"]), "C2026-0001"),
  "factuur-lang": () => {
    const veel: OfferteRegel[] = Array.from({ length: 34 }, (_, i) => regel(`v${i}`, `Onderdeel ${i + 1}: levering en aanleg beplanting, inclusief grondverbetering en afvoer`, 1 + (i % 4), 3500 + i * 275, i % 3 === 0 ? 9 : 21, { eenheid: "stuks" }));
    return klaar(eenFactuurUitOfferte(bron({ regels: veel }), inst), "F2026-0012");
  },
} as const;

