import Link from "next/link";
import { Check } from "lucide-react";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { MaatH, Positie } from "@/app/components/landing/maat";
import { HuisstijlVergelijk } from "@/app/components/landing/huisstijl-vergelijk";
import { StappenSlider, type Stap } from "@/app/components/landing/stappen-slider";

// Sectie 3: slider met de stappen van het proces (zie stappen-slider.tsx). Alle tekst staat in de pagina; de slides worden alleen weggescrold.
const GEKOZEN = ["bestrating", "schutting", "graszoden"];

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

// Alle onderdelen waarmee je begint, met rekenmethode en een voorbeeld; de rijen komen uit de echte presets.
function Beeld1() {
  return (
    <div className="overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
      <p className="border-b border-lp-lijn bg-lp-papier-2 px-4 py-3 font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Kies wat je doet</p>
      <ul className="grid divide-y divide-lp-lijn sm:grid-cols-2 sm:divide-y-0" aria-label="Onderdelen met rekenmethode en een voorbeeld">
        {HOVENIER_PRESETS.map((p) => {
          const aan = GEKOZEN.includes(p.id);
          const Icoon = PRODUCT_ICONS[p.icoon];
          return (
            <li key={p.id} className={`flex min-h-12 items-center gap-2.5 px-3 py-1.5 sm:border-b sm:border-lp-lijn ${aan ? "bg-lp-bos-100" : ""}`}>
              <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-lp-lijn ${aan ? "bg-lp-bos-800 text-white" : "bg-lp-wit"}`}>
                {aan && <Check className="h-4 w-4" />}
              </span>
              <span aria-hidden="true" className={`hidden h-6 w-8 shrink-0 border border-lp-inkt sm:block ${STAAL[p.id] ?? ""}`} />
              {Icoon && <Icoon className="h-5 w-5 shrink-0 text-lp-bos-800" aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold sm:text-base">{p.naam}</span>
                <span className="block truncate text-xs text-lp-inkt-2 tabular-nums sm:text-sm">
                  {METHODE[p.rekenmethode]} · {p.voorbeeldHoeveelheid} {EENHEID[p.eenheid]} · {p.materialen.map((m) => m.naam).slice(0, 3).join(", ")}
                </span>
              </span>
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
              <th scope="row" className="px-4 py-2 text-left font-semibold">
                {m.naam}
                <span className="ml-2 rounded-sm bg-lp-oker-licht px-1.5 py-0.5 align-middle font-lp-maat text-[10px] text-lp-inkt">voorbeeld</span>
              </th>
              <td className="px-4 py-2 text-right">€ {m.prijs},00</td>
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
            <span className="mt-1 flex h-16 items-center justify-center rounded-xl border border-dashed border-lp-bos-700 font-lp-maat text-[11px] text-lp-bos-800">hier staat je rekentool</span>
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

const LINK = "font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4";

// Elke slide: nummer, titel, uitleg en beeld. Wat vroeger de losse secties "Jouw huisstijl" en "Onderdelen" waren, staat nu bij de stap waar het over gaat.
function Slide({ nr, titel, children, beeld }: { nr: string; titel: string; children: React.ReactNode; beeld: React.ReactNode }) {
  return (
    <div className="lp-zacht grid h-full gap-5 rounded-3xl border border-lp-lijn bg-lp-wit p-4 sm:px-14 sm:py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-8 lg:px-16 lg:gap-10">
      <div>
        <Kop nr={nr} titel={titel} />
        {children}
      </div>
      <div>{beeld}</div>
    </div>
  );
}

function Kop({ nr, titel }: { nr: string; titel: string }) {
  return (
    <>
      <p className="text-3xl font-semibold tracking-[-0.05em] text-lp-bos-700 sm:text-4xl">{nr}</p>
      <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">{titel}</h3>
    </>
  );
}

const STAPPEN: Stap[] = [
  {
    id: "stap-onderdelen",
    nr: "01",
    titel: "Kies je onderdelen",
    inhoud: (
      <Slide
        nr="01"
        titel="Kies je onderdelen"
        beeld={<Beeld1 />}
      >
        <p className="mt-2 max-w-md text-base text-lp-inkt-2 sm:text-lg">
          Vink aan wat je doet: schutting, bestrating, graszoden, vlonder. Je krijgt meteen een werkende rekentool met voorbeeldprijzen, zonder iets te hoeven bouwen.
        </p>
        <p className="mt-2 max-w-md text-base text-lp-inkt-2 sm:text-lg">
          Elk onderdeel rekent op zijn eigen manier, met jouw materialen en jouw werktempo. Dit zijn de onderdelen waarmee je begint; je past ze aan of voegt er zelf een toe.
        </p>
        <p className="mt-4 text-base">
          <Link href="/voorbeelden-rekentools" className={LINK}>
            Voorbeelden van rekentools
          </Link>{" "}
          ·{" "}
          <Link href="/rekentool-templates" className={LINK}>
            Templates
          </Link>
        </p>
      </Slide>
    ),
  },
  {
    id: "stap-prijzen",
    nr: "02",
    titel: "Vul je prijzen in",
    inhoud: (
      <Slide nr="02" titel="Vul je prijzen in" beeld={<Beeld2 />}>
        <p className="mt-2 max-w-md text-base text-lp-inkt-2 sm:text-lg">
          Zet je eigen materiaalprijzen erin, hoeveel je in een dagdeel doet en wat je per dagdeel rekent. Voorbeeldprijzen zijn geel gemarkeerd tot je ze hebt aangepast.
        </p>
      </Slide>
    ),
  },
  {
    id: "stap-huisstijl",
    nr: "03",
    titel: "Maak hem van jou",
    inhoud: (
      <div className="lp-zacht h-full rounded-3xl border border-lp-lijn bg-lp-wit p-4 sm:px-14 sm:py-6 lg:px-16">
        <HuisstijlVergelijk
          kop={
            <>
              <Kop nr="03" titel="Maak hem van jou" />
              <p className="mt-2 max-w-md text-base text-lp-inkt-2 sm:text-lg">Eruit zien als jouw bedrijf, vanaf de eerste keer.</p>
              <MaatH label="logo en kleuren van jouw website" className="mt-4 hidden max-w-md md:flex" />
            </>
          }
        />
      </div>
    ),
  },
  {
    id: "stap-website",
    nr: "04",
    titel: "Zet hem op je website",
    inhoud: (
      <Slide nr="04" titel="Zet hem op je website" beeld={<Beeld3 />}>
        <p className="mt-2 max-w-md text-base text-lp-inkt-2 sm:text-lg">
          Plaats de rekentool op je website of deel de link. Het werkt met WordPress, Wix, Squarespace en Jouwweb. Een eerste versie staat er in een paar minuten, ook zonder computerkennis.
        </p>
        <p className="mt-4">
          <Link href="/rekentool-op-eigen-website" className={LINK}>
            Rekentool op je eigen website zetten
          </Link>
        </p>
      </Slide>
    ),
  },
];

// Oude ankers van de losse secties "Jouw huisstijl" (#huisstijl) en "Onderdelen" (#werkzaamheden) openen de bijbehorende slide.
const ANKERS = { huisstijl: 2, werkzaamheden: 0 };

export function SectieZoWerktHet() {
  return (
    <section id="zo-werkt-het" aria-labelledby="h-zo" className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <Positie nr="03" label="Zo werkt het" />
      <h2 id="h-zo" className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] sm:text-5xl">
        In vier stappen staat je rekentool online
      </h2>
      <div className="mt-10">
        <StappenSlider stappen={STAPPEN} ankers={ANKERS} label="Zo werkt het, in vier stappen" />
      </div>
    </section>
  );
}
