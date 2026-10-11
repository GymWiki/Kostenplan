import { MaatH, Positie } from "@/app/components/landing/maat";
import { STIJLEN } from "@/app/lib/landing/demo-data";

// Sectie 6: donkere band met een telefoon. Vanuit het belang van de hovenier:
// zijn klant rekent zelf, ook 's avonds en in het weekend.
const TIJDLIJN = [
  ["21:47", "Je klant zit op de bank en opent jouw website op zijn telefoon."],
  ["21:49", "Hij kiest klinkers, vult de maten in en ziet de prijs. Zonder te bellen."],
  ["21:51", "Hij stuurt een aanvraag. Jij leest hem morgen tussen twee klussen door."],
];

export function SectieKlantervaring() {
  const s = STIJLEN.groenhof;
  return (
    <section aria-labelledby="h-klant" className="px-3 py-2 sm:px-6">
      <div className="mx-auto rounded-[2rem] bg-lp-bos-950 text-lp-papier sm:rounded-[2.5rem] grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
        <div>
          <Positie nr="06" label="Wat je klant ervaart" className="text-lp-bos-100 [&>span:first-child]:bg-lp-bos-800 [&>span:first-child]:text-lp-oker-licht" />
          <h2 id="h-klant" className="mt-4 text-4xl font-semibold leading-[1.02] sm:text-5xl">
            Hij rekent op jouw site. Ook als jij niet werkt.
          </h2>
          <p className="mt-5 max-w-xl text-lg text-lp-bos-100">
            Je klant berekent in een minuut zijn prijs op jouw website en stuurt een aanvraag, ook ’s avonds en in het weekend. Jij hoeft niet te bellen en niets uit te rekenen.
          </p>
          <ol className="mt-8 divide-y divide-lp-bos-700 border-y border-lp-bos-700">
            {TIJDLIJN.map(([tijd, tekst]) => (
              <li key={tijd} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-4">
                <time className="font-lp-maat text-sm text-lp-oker-licht">{tijd}</time>
                <p className="text-base">{tekst}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto w-full max-w-[22rem]">
          <div className="rounded-[2.25rem] border-[3px] border-lp-bos-700 bg-lp-bos-900 p-2.5">
            <div className="overflow-hidden rounded-[1.6rem] bg-lp-wit">
              <div className="flex items-center gap-2 bg-lp-papier-2 px-3 py-2 font-lp-maat text-[11px] text-lp-inkt-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 bg-lp-inkt-2" />
                <span className="truncate">{s.site}/rekentool</span>
              </div>
              <iframe
                src="/demo/rekentool/groenhof"
                title={`De rekentool op de website van ${s.naam}, een fictief hoveniersbedrijf, zoals een klant hem op zijn telefoon ziet`}
                loading="lazy"
                className="block h-[540px] w-full border-0"
              />
            </div>
          </div>
          <MaatH label="telefoon" className="mt-3 text-lp-bos-100" />
        </div>
      </div>
    </section>
  );
}
