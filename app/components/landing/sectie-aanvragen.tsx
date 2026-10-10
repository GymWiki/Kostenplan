import Link from "next/link";
import { MaatH, Positie } from "@/app/components/landing/maat";
import { bouwDemoDraft, STIJLEN } from "@/app/lib/landing/demo-data";
import { draftNaarKosten, draftNaarProducten } from "@/app/lib/draft-editor";
import { presetById } from "@/app/lib/presets";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import { formatCurrency } from "@/app/lib/format";
import type { PreviewProduct } from "@/app/lib/werkzaamheid";

// Sectie 5: een aanvraag zoals die bij de hovenier binnenkomt, naast de
// conceptofferte. De bedragen komen uit de echte rekenlogica (dezelfde
// functie als in de editor) met de voorbeeldprijzen uit de presets.
const TIJDEN = ["21:47", "gisteren", "maandag"];

export function SectieAanvragen() {
  const draft = bouwDemoDraft(STIJLEN.groenhof);
  const producten = draftNaarProducten(draft);
  const kosten = draftNaarKosten(draft);
  const rijen = draft.calculator.werkzaamheden.map((w, i) => {
    const preset = presetById(w.presetId ?? "");
    const hoeveelheid = preset?.voorbeeldHoeveelheid ?? 20;
    const product = producten[i] as unknown as PreviewProduct;
    const optie = product.materiaalCategorieen[0].materialen[1] ?? product.materiaalCategorieen[0].materialen[0];
    const opbouw = berekenKostenOpbouw({ product, optieId: optie.id, hoeveelheid, costSettings: kosten });
    return { naam: w.draft.naam, eenheid: preset?.eenheid ?? "m2", hoeveelheid, materiaal: optie.naam, opbouw };
  });
  const eerste = rijen[0];
  const eh = (e: string) => (e === "m1" ? "m" : e === "m2" ? "m²" : "stuks");

  return (
    <section id="aanvragen" aria-labelledby="h-aanvragen" className="border-y-[1.5px] border-lp-inkt bg-lp-papier-2">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Positie nr="05" label="Aanvragen en offertes" />
            <h2 id="h-aanvragen" className="mt-4 text-4xl font-extrabold leading-[1.02] sm:text-5xl">
              Aanvragen die iets waard zijn
            </h2>
          </div>
          <p className="text-lg text-lp-inkt-2">
            Een aanvraag komt binnen met alles wat je nodig hebt: de maten, het gekozen materiaal, de prijs die je klant al gezien heeft en zijn gegevens. Jij past de conceptofferte aan en verstuurt hem pas als hij klopt.{" "}
            <Link href="/online-offerte-maken" className="font-semibold underline decoration-lp-oker decoration-2 underline-offset-4 hover:text-lp-inkt">
              Online offerte maken
            </Link>
            .
          </p>
        </div>

        {/* Inbox · werkbon · conceptofferte, één breed werkblad */}
        <div className="mt-10 grid border-[1.5px] border-lp-inkt bg-lp-wit lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)]">
          <div className="border-b-[1.5px] border-lp-inkt lg:border-b-0 lg:border-r-[1.5px]">
            <p className="border-b-[1.5px] border-lp-inkt bg-lp-inkt px-4 py-2.5 font-lp-maat text-[11px] uppercase tracking-wider text-lp-papier">Jouw aanvragen · voorbeeld</p>
            <ul>
              {rijen.map((r, i) => (
                <li key={r.naam} className={`flex items-center gap-3 border-b border-lp-lijn px-4 py-3 ${i === 0 ? "bg-lp-bos-100" : ""}`}>
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 ${i === 0 ? "bg-lp-oker" : "border border-lp-rand"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.naam}</span>
                    <span className="block text-sm text-lp-inkt-2 tabular-nums">
                      {r.hoeveelheid} {eh(r.eenheid)} · {formatCurrency(r.opbouw.totaal)}
                    </span>
                  </span>
                  <span className="shrink-0 font-lp-maat text-[11px] text-lp-inkt-2">{TIJDEN[i]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-b-[1.5px] border-lp-inkt p-5 sm:p-6 lg:border-b-0 lg:border-r-[1.5px]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold">Nieuwe aanvraag</h3>
              <span className="bg-lp-oker px-2 py-1 font-lp-maat text-[11px] uppercase tracking-wider">Nieuw</span>
            </div>
            <dl className="mt-4 divide-y divide-lp-lijn border-y border-lp-lijn text-sm">
              {[
                ["Werkzaamheid", eerste.naam],
                ["Afmetingen", "5 × 4 m = 20 m²"],
                ["Materiaal", eerste.materiaal],
                ["Berekende prijs", `${formatCurrency(rijen[0].opbouw.totaal)} excl. btw`],
                ["Naam", "Voorbeeld Klant"],
                ["Telefoon", "06 12 34 56 78"],
                ["E-mail", "voorbeeld@example.nl"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2">
                  <dt className="text-lp-inkt-2">{k}</dt>
                  <dd className="min-w-0 break-words font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <MaatH label="5,0 m" className="mt-5" />
            <p className="mt-3 text-sm text-lp-inkt-2">Fictieve klant en voorbeeldprijzen.</p>
          </div>

          <div className="bg-lp-staal p-5 sm:p-6">
            <div className="mx-auto max-w-sm border-[1.5px] border-lp-inkt bg-lp-wit p-4 shadow-[6px_6px_0_0_var(--lp-lijn)]">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-lp-display text-lg font-extrabold">Offerte</p>
                <p className="font-lp-maat text-[11px] uppercase tracking-wider text-lp-oker-donker">Concept</p>
              </div>
              <p className="mt-1 text-sm text-lp-inkt-2">{STIJLEN.groenhof.naam} · voorbeeld</p>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Regels van de conceptofferte</caption>
                <tbody className="divide-y divide-lp-lijn border-y border-lp-lijn tabular-nums">
                  {[
                    [`Materiaal · ${eerste.materiaal}`, eerste.opbouw.materiaal],
                    ["Arbeid", eerste.opbouw.arbeid],
                    ["Voorrijkosten", eerste.opbouw.voorrijkosten],
                    ["Transport", eerste.opbouw.transport],
                  ].map(([k, v]) => (
                    <tr key={String(k)}>
                      <th scope="row" className="py-1.5 pr-2 text-left font-normal">{k}</th>
                      <td className="py-1.5 text-right">{formatCurrency(Number(v))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <th scope="row" className="pt-2 text-left">Totaal excl. btw</th>
                    <td className="pt-2 text-right text-base">{formatCurrency(eerste.opbouw.totaal)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-4 border-t border-dashed border-lp-rand pt-3 text-sm text-lp-inkt-2">Jij controleert en past aan, daarna verstuur je hem.</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-lp-inkt-2">Aanvragen en offertes zijn onderdeel van Plus en Pro.</p>
      </div>
    </section>
  );
}
