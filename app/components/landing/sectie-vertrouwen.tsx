import { TESTIMONIALS } from "@/app/lib/landing/testimonials";
import { BEDRIJF } from "@/app/lib/landing/feiten";
import { Positie } from "@/app/components/landing/maat";

// Sectie 8: rustig, met een groot citaat. Zonder testimonials (zie
// app/lib/landing/testimonials.ts, TODO(Pieter)) toont de sectie alleen de
// feiten; er staat dan nergens een citaat of een verzonnen cijfer.
const FEITEN = [
  ["Gebouwd met een hoveniersbedrijf", "Kostenplan is ontwikkeld samen met een hoveniersbedrijf, op basis van hoe een hovenier echt prijzen opbouwt: materiaal, werktempo, dagdeeltarief, voorrijkosten."],
  ["Jouw prijzen, jouw aanvragen", "Je stelt de prijzen zelf in. Aanvragen komen in jouw eigen overzicht en jij beslist wat je ermee doet."],
  ["Gratis beginnen", "Je bouwt eerst gratis een voorbeeld, zonder account en zonder creditcard."],
  ["Een echt bedrijf erachter", `Kostenplan is onderdeel van ${BEDRIJF.naam}, KVK ${BEDRIJF.kvk}, ${BEDRIJF.plaats}.`],
];

export function SectieVertrouwen() {
  const t = TESTIMONIALS[0];
  return (
    <section aria-labelledby="h-vertrouwen" className="px-3 py-2 sm:px-6">
      <div className="mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-lp-bos-100 max-w-7xl px-5 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24">
        <Positie nr="08" label="Vertrouwen" />
        <h2 id="h-vertrouwen" className="sr-only">
          Waarom hoveniers Kostenplan kunnen vertrouwen
        </h2>
        {t ? (
          <figure className="mt-8 max-w-4xl">
            <blockquote className="font-lp-display text-3xl font-semibold leading-tight sm:text-5xl">“{t.tekst}”</blockquote>
            <figcaption className="mt-5 text-base text-lp-inkt-2">
              <span className="font-semibold text-lp-inkt">{t.naam}</span>, {t.bedrijf}
              {t.plaats ? `, ${t.plaats}` : ""}
            </figcaption>
          </figure>
        ) : (
          <p className="mt-8 max-w-4xl font-lp-display text-3xl font-semibold leading-tight sm:text-5xl">
            Gebouwd met een hoveniersbedrijf, voor hoveniers die hun avonden terug willen.
          </p>
        )}
        <dl className="mt-12 grid gap-x-12 border-t border-lp-lijn sm:grid-cols-2">
          {FEITEN.map(([k, v]) => (
            <div key={k} className="border-b border-lp-rand py-5">
              <dt className="text-lg font-semibold">{k}</dt>
              <dd className="mt-1 text-base text-lp-inkt-2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
