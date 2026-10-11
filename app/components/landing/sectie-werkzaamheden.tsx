import Link from "next/link";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { MaatH, Positie } from "@/app/components/landing/maat";

// Sectie 7: een bestek-/materiaallijst met maatvoering, geen kaartjes. De rijen
// komen uit de echte presets (dezelfde die een nieuwe hovenier te kiezen krijgt).
const METHODE: Record<string, string> = {
  "strekkende-meter": "Per meter",
  "lengte-breedte": "Lengte × breedte",
  m2: "Per m²",
  stuks: "Per stuk",
};
const EENHEID: Record<string, string> = { m1: "m", m2: "m²", stuks: "stuks" };
const STAAL: Record<string, string> = {
  schutting: "staal-hout",
  bestrating: "staal-klinker",
  graszoden: "staal-gras",
  kunstgras: "staal-kunstgras",
  vlonder: "staal-hout",
  "haag-beplanting": "staal-haag",
  "grondwerk-afvoer": "staal-grond",
  "boom-planten": "staal-boom",
  tuinonderhoud: "staal-gras",
};

export function SectieWerkzaamheden() {
  return (
    <section id="werkzaamheden" aria-labelledby="h-wz" className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <Positie nr="07" label="Werkzaamheden" />
          <h2 id="h-wz" className="mt-4 text-4xl font-semibold leading-[1.02] sm:text-5xl">
            Wat je kunt laten uitrekenen
          </h2>
          <p className="mt-5 max-w-md text-lg text-lp-inkt-2">
            Elke werkzaamheid rekent op zijn eigen manier, met jouw materialen en jouw werktempo. Dit zijn de werkzaamheden waarmee je begint; je past ze aan of voegt er zelf een toe.
          </p>
          <p className="mt-4 text-base">
            <Link href="/voorbeelden-rekentools" className="font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4">
              Voorbeelden van rekentools
            </Link>{" "}
            ·{" "}
            <Link href="/rekentool-templates" className="font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4">
              Templates
            </Link>
          </p>
        </div>

        <div>
          <MaatH label="bestek · begin hier" />
          <table className="mt-3 w-full border-t border-lp-lijn text-left">
            <caption className="sr-only">Werkzaamheden met rekenmethode en een voorbeeld</caption>
            <thead className="sr-only md:table-header-group md:not-sr-only">
              <tr className="border-b border-lp-lijn font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">
                <th scope="col" className="w-10 py-2 pr-2 font-medium">Pos.</th>
                <th scope="col" className="w-14 py-2 font-medium">Staal</th>
                <th scope="col" className="py-2 font-medium">Werkzaamheid</th>
                <th scope="col" className="py-2 font-medium">Rekenmethode</th>
                <th scope="col" className="py-2 font-medium">Voorbeeld</th>
              </tr>
            </thead>
            <tbody>
              {HOVENIER_PRESETS.map((p, i) => (
                <tr key={p.id} className="block border-b border-lp-lijn py-3 transition-colors hover:bg-lp-papier-2/70 md:table-row md:py-0">
                  <td className="block font-lp-maat text-[11px] text-lp-bos-700 md:table-cell md:py-4 md:pr-2">{String(i + 1).padStart(2, "0")}</td>
                  <td className="hidden md:table-cell md:py-4">
                    <span aria-hidden="true" className={`block h-8 w-10 border border-lp-inkt ${STAAL[p.id] ?? ""}`} />
                  </td>
                  <th scope="row" className="block text-lg font-semibold md:table-cell md:py-4 md:pr-3">{p.naam}</th>
                  <td className="block text-base md:table-cell md:py-4 md:pr-3">{METHODE[p.rekenmethode]}</td>
                  <td className="block text-base text-lp-inkt-2 tabular-nums md:table-cell md:py-4">
                    {p.voorbeeldHoeveelheid} {EENHEID[p.eenheid]} · {p.materialen.map((m) => m.naam).slice(0, 3).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
