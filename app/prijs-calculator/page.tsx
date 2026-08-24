import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";

const TITLE = "Klanten zelf een prijs laten berekenen";
const DESCRIPTION =
  "Waarom en hoe je bezoekers op je website zelf een prijsindicatie laat berekenen, met een concreet rekenvoorbeeld en wat je nodig hebt om te starten.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/prijs-calculator" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/prijs-calculator",
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const FAQS = [
  {
    vraag: "Kan ik klanten direct een prijs laten zien, zonder dat ze eerst contact opnemen?",
    antwoord:
      "Ja. Zodra een bezoeker de vragen in de rekentool heeft beantwoord, verschijnt de prijsindicatie direct op het scherm, nog vóórdat er enig contact met de vakman is geweest.",
  },
  {
    vraag: "Kan ik een compleet project laten berekenen, met meerdere onderdelen tegelijk?",
    antwoord:
      "Ja. Een rekentool kan uit meerdere onderdelen bestaan die samen tot één totaalprijs worden opgeteld — bijvoorbeeld bestrating, een schutting en kunstgras samen in één tuinaanleg-berekening, of een compleet keukenblok met werkblad en apparatuur in één keukenberekening.",
  },
  {
    vraag: "Kan ik mijn eigen huisstijl gebruiken in de rekentool?",
    antwoord:
      "Ja. Je stelt je eigen logo en kleuren in, zodat de rekentool herkenbaar aanvoelt als onderdeel van jouw bedrijf en niet als losse, externe software.",
  },
  {
    vraag: "Blijft de prijsindicatie kloppen als ik mijn tarieven aanpas?",
    antwoord:
      "Ja, voor nieuwe berekeningen. Pas je een tarief aan, dan gebruikt elke nieuwe berekening automatisch de bijgewerkte prijs. Een eerder aangevraagde offerte verandert niet met terugwerkende kracht — die blijft vastgezet op de prijzen van het moment van aanvragen.",
  },
  {
    vraag: "Is een prijsindicatie hetzelfde als een bindende offerte?",
    antwoord:
      "Nee. Een prijsindicatie is een schatting op basis van de door de klant ingevulde gegevens. Een bindende offerte volgt pas na beoordeling door de vakman zelf, eventueel na een opname ter plaatse — de rekentool versnelt en filtert dat traject, maar vervangt niet de uiteindelijke offerte.",
  },
];

export default function PrijsCalculatorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs
        items={[
          { label: "Rekentool", href: "/rekentool" },
          { label: "Prijs calculator", href: "/prijs-calculator" },
        ]}
      />

      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Prijs calculator
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Laat klanten zelf een prijs berekenen
            </h1>
            <div className="mt-6 text-left">
              <GeoAnswer>
                Klanten zelf een prijs laten berekenen betekent dat bezoekers op je website hun
                eigen situatie invullen — bijvoorbeeld afmetingen en materiaalkeuze — en direct een
                prijsindicatie te zien krijgen, gebaseerd op tarieven die jij vooraf hebt
                ingesteld. Jij hoeft daar zelf niets voor te berekenen of terug te bellen.
              </GeoAnswer>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/registreren" size="lg">
                Start met je eigen prijs calculator
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/rekentool" size="lg" variant="outline">
                Wat is een rekentool?
              </LinkButton>
            </div>
          </Reveal>
        </section>

        {/* VOORBEELD */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal className="text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Een concreet rekenvoorbeeld
              </h2>
              <p className="mt-3 text-muted-foreground">
                Zo ziet een prijsberekening eruit voor een schutting van 12 meter.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <Card className="mt-10">
                <CardContent className="flex flex-col gap-3">
                  <RegelRij label="Materiaal: hardhouten palen" waarde="12 m1 × € 18,-" totaal="€ 216,-" />
                  <RegelRij label="Tussenschot planken" waarde="12 m1 × € 24,-" totaal="€ 288,-" />
                  <RegelRij label="Arbeid plaatsen" waarde="12 m1 × € 65,-" totaal="€ 780,-" />
                  <RegelRij label="Poort (extra)" waarde="1 stuk" totaal="€ 196,-" />
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-semibold text-foreground">Totale prijsindicatie</span>
                    <span className="text-xl font-bold text-primary">€ 1.480,-</span>
                  </div>
                </CardContent>
              </Card>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Elke regel volgt automatisch uit de antwoorden van de klant en de tarieven die de
                vakman vooraf heeft ingesteld — niemand hoeft dit met de hand na te rekenen.
              </p>
            </Reveal>
          </div>
        </section>

        {/* WAT HEB JE NODIG */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Wat heb je nodig om te starten?
            </h2>
            <ul className="mt-6 flex flex-col gap-4">
              {[
                "Je basistarieven: uurtarief, voorrijkosten en gewenste materiaalmarge.",
                "Een lijst van de producten of onderdelen die je aanbiedt, met hun prijs of prijs per eenheid.",
                "De vragen die bepalen welke prijs van toepassing is, bijvoorbeeld afmetingen, materiaalkeuze of extra opties.",
              ].map((tekst) => (
                <li key={tekst} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{tekst}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-muted-foreground">
              Met alleen deze basis staat een eerste prijs calculator al binnen enkele minuten
              live — je kunt hem daarna altijd uitbreiden met meer producten, onderdelen of
              voorwaardelijke vragen.
            </p>
          </Reveal>
        </section>

        <FaqSection
          faqs={FAQS}
          id="prijs-calculator-faq"
          titel="Veelgestelde vragen over prijsberekening"
          intro="Wat klanten precies zien, en wat jij als vakman zelf blijft bepalen."
        />

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Wil je ook direct de offerteaanvraag na de berekening ontvangen?{" "}
              <Link href="/offerte-calculator" className="font-medium text-primary hover:underline">
                Bekijk de offerte calculator
              </Link>
              .
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              </div>
              <h2 className="text-2xl font-semibold text-balance text-primary-foreground sm:text-3xl">
                Zet je eigen prijs calculator live
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Gratis starten met tot 10 producten. Binnen 5 minuten online.
              </p>
              <div className="relative mt-8 inline-flex">
                <span
                  aria-hidden="true"
                  className="animate-soft-pulse absolute -inset-3 -z-10 rounded-full bg-white/20 blur-xl"
                />
                <LinkButton
                  href="/registreren"
                  size="lg"
                  className="border-transparent bg-white text-primary hover:bg-white/90"
                >
                  Start nu gratis
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function RegelRij({ label, waarde, totaal }: { label: string; waarde: string; totaal: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground">{waarde}</p>
      </div>
      <span className="shrink-0 font-medium text-foreground">{totaal}</span>
    </div>
  );
}
