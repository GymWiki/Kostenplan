import Link from "next/link";
import { Check } from "lucide-react";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { Positie } from "@/app/components/landing/maat";

// Sectie 3: sticky scroll, volledig in CSS. Elke stap is een rij; het beeld
// blijft staan (sticky) terwijl de tekst van de stap voorbijkomt, daarna komt het
// beeld van de volgende stap. Zonder JavaScript staat alles gewoon onder elkaar.
const GEKOZEN = ["bestrating", "schutting", "graszoden"];

function Beeld1() {
  const lijst = HOVENIER_PRESETS.slice(0, 6);
  return (
    <div className="overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
      <p className="border-b border-lp-lijn bg-lp-papier-2 px-4 py-3 font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Kies wat je doet</p>
      <ul className="divide-y divide-lp-lijn">
        {lijst.map((p) => {
          const aan = GEKOZEN.includes(p.id);
          const Icoon = PRODUCT_ICONS[p.icoon];
          return (
            <li key={p.id} className={`flex min-h-14 items-center gap-3 px-4 ${aan ? "bg-lp-bos-100" : ""}`}>
              <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-lp-lijn ${aan ? "bg-lp-bos-800 text-white" : "bg-lp-wit"}`}>
                {aan && <Check className="h-4 w-4" />}
              </span>
              {Icoon && <Icoon className="h-5 w-5 shrink-0 text-lp-bos-800" aria-hidden="true" />}
              <span className="min-w-0 flex-1 text-base font-semibold">{p.naam}</span>
              <span className="hidden font-lp-maat text-[11px] text-lp-inkt-2 sm:inline">{p.rekenmethode === "lengte-breedte" ? "l × b" : p.rekenmethode === "m2" ? "per m²" : p.rekenmethode === "stuks" ? "per stuk" : "per m"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Beeld2() {
  const p = HOVENIER_PRESETS.find((x) => x.id === "bestrating")!;
  return (
    <div className="overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
      <p className="border-b border-lp-lijn bg-lp-papier-2 px-4 py-3 font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Bestrating / terras · jouw prijzen</p>
      <table className="w-full text-base">
        <caption className="sr-only">Materialen en prijzen per m²</caption>
        <thead>
          <tr className="border-b border-lp-lijn text-left font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">
            <th scope="col" className="px-4 py-2 font-medium">Materiaal</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Prijs per m²</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lp-lijn tabular-nums">
          {p.materialen.map((m) => (
            <tr key={m.naam}>
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                {m.naam}
                <span className="ml-2 rounded-sm bg-lp-oker-licht px-1.5 py-0.5 align-middle font-lp-maat text-[10px] text-lp-inkt">voorbeeld</span>
              </th>
              <td className="px-4 py-3 text-right">€ {m.prijs},00</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-2 border-t border-lp-lijn text-sm">
        <p className="border-r border-lp-lijn px-4 py-3">
          <span className="block font-lp-maat text-[11px] text-lp-inkt-2">Werktempo</span>
          <span className="font-semibold">{p.productiviteitPerDag / 2} m² per dagdeel</span>
        </p>
        <p className="px-4 py-3">
          <span className="block font-lp-maat text-[11px] text-lp-inkt-2">Jouw tarief</span>
          <span className="font-semibold">€ 180 per dagdeel</span>
        </p>
      </div>
    </div>
  );
}

function Beeld3() {
  return (
    <div className="overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
      <div className="flex items-center gap-2 border-b border-lp-lijn bg-lp-papier-2 px-4 py-2.5 font-lp-maat text-[11px] text-lp-inkt-2">
        <span aria-hidden="true" className="h-2 w-2 bg-lp-inkt-2" />
        jouwbedrijf.nl/rekentool
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <p className="font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Jouw pagina</p>
          <div className="mt-2 flex flex-col gap-2" aria-hidden="true">
            <span className="h-3 w-3/4 bg-lp-lijn" />
            <span className="h-3 w-1/2 bg-lp-lijn" />
            <span className="mt-1 flex h-24 items-center justify-center rounded-xl border border-dashed border-lp-bos-700 font-lp-maat text-[11px] text-lp-bos-800">hier staat je rekentool</span>
          </div>
        </div>
        <div>
          <p className="font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Pro: plak één stukje code</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-lp-bos-950 p-3 font-lp-maat text-[11px] leading-relaxed text-lp-bos-100">{`<iframe
  src="https://…"
  title="Rekentool"
  width="100%"
  height="800">
</iframe>`}</pre>
          <p className="mt-2 text-sm text-lp-inkt-2">Gratis en Plus: deel de link naar je rekentool.</p>
        </div>
      </div>
    </div>
  );
}

const STAPPEN = [
  {
    nr: "01",
    titel: "Kies je werkzaamheden",
    tekst: "Vink aan wat je doet: schutting, bestrating, graszoden, vlonder. Je krijgt meteen een werkende rekentool met voorbeeldprijzen, zonder iets te hoeven bouwen.",
    beeld: <Beeld1 />,
  },
  {
    nr: "02",
    titel: "Vul je prijzen in",
    tekst: "Zet je eigen materiaalprijzen erin, hoeveel je in een dagdeel doet en wat je per dagdeel rekent. Voorbeeldprijzen zijn geel gemarkeerd tot je ze hebt aangepast.",
    beeld: <Beeld2 />,
  },
  {
    nr: "03",
    titel: "Zet hem op je website",
    tekst: "Plaats de rekentool op je website of deel de link. Het werkt met WordPress, Wix, Squarespace en Jouwweb. Een eerste versie staat er in een paar minuten, ook zonder computerkennis.",
    beeld: <Beeld3 />,
  },
];

export function SectieZoWerktHet() {
  return (
    <section id="zo-werkt-het" aria-labelledby="h-zo" className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <Positie nr="03" label="Zo werkt het" />
      <h2 id="h-zo" className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] sm:text-5xl">
        In drie stappen staat je rekentool online
      </h2>
      <div className="mt-10 border-t border-lp-lijn">
        {STAPPEN.map((s) => (
          <div key={s.nr} className="grid gap-8 border-b border-lp-lijn lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
            <div className="flex flex-col justify-center py-10 lg:min-h-[80vh] lg:py-24">
              <p className="text-5xl font-semibold tracking-[-0.05em] text-lp-bos-700">{s.nr}</p>
              <h3 className="mt-4 text-3xl font-semibold">{s.titel}</h3>
              <p className="mt-3 max-w-md text-lg text-lp-inkt-2">{s.tekst}</p>
              {s.nr === "03" && (
                <p className="mt-4">
                  <Link href="/rekentool-op-eigen-website" className="font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4">
                    Rekentool op je eigen website zetten
                  </Link>
                </p>
              )}
            </div>
            <div className="self-start pb-10 lg:sticky lg:top-24 lg:py-24">{s.beeld}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
