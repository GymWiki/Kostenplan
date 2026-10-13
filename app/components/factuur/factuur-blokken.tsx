import type { Totalen } from "@/app/lib/offerte/bereken";
import { formatCents, formatDatum } from "@/app/lib/offerte/weergave";
import { BTW_VERLEGD_TEKST, type FactuurInhoud } from "@/app/lib/factuur/model";

// Factuurspecifieke onderdelen van het gedeelde A4-document (zie OfferteDocument): metagegevens, berekening van een
// termijn, het betaalblok en het watermerk voor een concept.

export const heeftNummer = (f: FactuurInhoud["factuur"]) => Boolean(f.nummer);

export function FactuurMetaRijen({ inhoud }: { inhoud: FactuurInhoud }) {
  const f = inhoud.factuur;
  const credit = f.soort === "creditnota";
  return (
    <>
      <dt>{credit ? "Creditnotanummer" : "Factuurnummer"}</dt>
      <dd>{f.nummer ?? <span style={{ color: "#b45309" }}>nog geen nummer</span>}</dd>
      <dt>{credit ? "Datum" : "Factuurdatum"}</dt>
      <dd>{formatDatum(f.factuurdatum)}</dd>
      <dt>{f.soort === "termijn" ? "Datum vooruitbetaling" : f.uitvoeringTot ? "Uitvoering" : "Uitvoeringsdatum"}</dt>
      <dd>{f.uitvoeringVan ? (f.uitvoeringTot ? `${formatDatum(f.uitvoeringVan)} t/m ${formatDatum(f.uitvoeringTot)}` : formatDatum(f.uitvoeringVan)) : <span style={{ color: "#b45309" }}>nog invullen</span>}</dd>
      {!credit && (
        <>
          <dt>Vervaldatum</dt>
          <dd>{formatDatum(f.vervaldatum)}</dd>
        </>
      )}
      {f.offerteNummer ? (
        <>
          <dt>Offertenummer</dt>
          <dd>{f.offerteNummer}</dd>
        </>
      ) : null}
      {f.creditVoor ? (
        <>
          <dt>Betreft factuur</dt>
          <dd>
            {f.creditVoor.nummer} van {formatDatum(f.creditVoor.datum)}
          </dd>
        </>
      ) : null}
    </>
  );
}

export function FactuurKlantExtra({ inhoud }: { inhoud: FactuurInhoud }) {
  const id = inhoud.factuur.klantBtwId.trim();
  return id && inhoud.klant.type === "zakelijk" ? <div>Btw-id: {id}</div> : null;
}

export function FactuurTermijnBlok({ inhoud }: { inhoud: FactuurInhoud }) {
  const t = inhoud.factuur.termijn;
  if (!t) return null;
  return (
    <div className="og-blok">
      <h3>Berekening</h3>
      <p className="og-klein">
        {t.label}: {t.percentage}% van het offertebedrag van {formatCents(t.offerteTotaalInclCenten)} (offerte {inhoud.factuur.offerteNummer}). De resterende {Math.round((100 - t.percentage) * 100) / 100}% volgt op een latere factuur, waarop deze factuur wordt afgetrokken.
      </p>
    </div>
  );
}

// "Graag € X vóór <vervaldatum> overmaken op <IBAN> t.n.v. <naam> o.v.v. <factuurnummer>", met de betaallink als die is ingevuld.
export function FactuurBetaalBlok({ inhoud, totalen }: { inhoud: FactuurInhoud; totalen: Totalen }) {
  const a = inhoud.afzender;
  const f = inhoud.factuur;
  const credit = f.soort === "creditnota";
  if (credit) {
    return (
      <div className="og-blok">
        <h3>Verrekening</h3>
        <p className="og-klein">Dit bedrag van {formatCents(Math.abs(totalen.totaalIncl))} wordt met u verrekend. U hoeft niets te betalen.</p>
      </div>
    );
  }
  return (
    <div className="og-blok" data-factuur-betaling>
      <h3>Betaling</h3>
      <p>
        Graag <strong>{formatCents(totalen.totaalIncl)}</strong> vóór <strong>{formatDatum(f.vervaldatum)}</strong> overmaken op IBAN <strong>{a.iban}</strong>
        {a.ibanTenaamstelling ? ` t.n.v. ${a.ibanTenaamstelling}` : ""} onder vermelding van <strong>{f.nummer ?? "het factuurnummer"}</strong>.
      </p>
      {f.betaallink.trim() ? (
        <p className="og-klein" style={{ marginTop: "1.5mm" }}>
          U kunt ook online betalen: <span style={{ wordBreak: "break-all" }}>{f.betaallink.trim()}</span>
        </p>
      ) : null}
      {totalen.verlegd ? <p className="og-klein" style={{ marginTop: "1.5mm" }}>{BTW_VERLEGD_TEKST}.</p> : null}
    </div>
  );
}

export function FactuurWatermerk({ inhoud }: { inhoud: FactuurInhoud }) {
  if (heeftNummer(inhoud.factuur)) return null;
  return (
    <div className="og-watermerk" aria-hidden="true">
      Concept – nog geen nummer
    </div>
  );
}
