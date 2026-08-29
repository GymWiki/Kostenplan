import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Globe2,
  ListChecks,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";
import { WebsiteCalculatorMockup } from "@/app/components/marketing/website-calculator-mockup";
import { DOELGROEPEN } from "@/app/lib/doelgroepen";

const TITLE = "Rekentool voor je website maken";
const DESCRIPTION =
  "Bouw zelf een rekentool waarmee klanten direct een prijsindicatie berekenen — zonder programmeerkennis. Ontdek wat een rekentool is en hoe je er één maakt met Kostenplan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/rekentool" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/rekentool",
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
    vraag: "Wat is een rekentool op een website?",
    antwoord:
      "Een rekentool is een interactief onderdeel op een website waarmee een bezoeker zelf, op basis van eigen invoer zoals afmetingen, materiaalkeuze of type project, direct een prijsindicatie te zien krijgt. In plaats van dat de bezoeker moet bellen of mailen om een indicatie te krijgen, rekent de tool het antwoord meteen op basis van de tarieven die de eigenaar van de website vooraf heeft ingesteld.",
  },
  {
    vraag: "Heb ik programmeerkennis nodig om een rekentool te maken?",
    antwoord:
      "Nee. Met Kostenplan stel je vragen, prijsregels en voorwaarden in via een visuele bouwer — zonder code, formules in een taal of technische kennis. Je kiest uit kant-en-klare onderdelen (bijvoorbeeld 'bestrating' of 'schilderwerk') of bouwt zelf een onderdeel op met je eigen vragen en prijzen.",
  },
  {
    vraag: "Kan ik meerdere rekentools maken voor verschillende diensten?",
    antwoord:
      "Ja. Eén Kostenplan-account kan meerdere rekentools bevatten, bijvoorbeeld één voor tuinaanleg en één voor bestrating apart. Elke rekentool heeft een eigen link en kan los op je website of in een aparte pagina geplaatst worden.",
  },
  {
    vraag: "Wat is het verschil tussen een rekentool en een offerteprogramma?",
    antwoord:
      "Een offerteprogramma is bedoeld voor de vakman zelf: je typt er intern een offerte in die je vervolgens naar een klant stuurt. Een rekentool draait juist op de website van de vakman en wordt door de klant zelf bediend — die krijgt direct een prijsindicatie te zien vóórdat er contact is geweest. Kostenplan combineert beide: de rekentool op de website levert automatisch een lead met de gekozen opties in een eigen leads-overzicht, waar de vakman die vervolgens kan omzetten in een officiële offerte.",
  },
  {
    vraag: "Werkt een rekentool voor elk vakgebied?",
    antwoord:
      "Een rekentool werkt goed voor elk vakgebied waarin de prijs is op te bouwen uit meetbare grootheden zoals oppervlakte, lengte, aantal, materiaalkeuze of extra opties — denk aan hoveniers, stratenmakers, schilders, klusbedrijven, keukenbedrijven, badkamerbedrijven en kozijnenbedrijven. Voor projecten die per geval volledig uniek zijn en zich niet in vaste onderdelen laten opdelen, blijft een rekentool een indicatie in plaats van een exacte offerte.",
  },
];

export default function RekentoolPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Rekentool", href: "/rekentool" }]} />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
          </div>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Rekentool
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                  Een rekentool voor je website, gebouwd voor vakmensen
                </h1>
                <div className="mt-6 text-left">
                  <GeoAnswer>
                    Een rekentool is een interactief onderdeel op je website waarmee bezoekers
                    zelf, op basis van hun eigen invoer, direct een prijsindicatie berekenen.
                    Kostenplan is een online tool waarmee vakmensen zo&apos;n rekentool zelf bouwen
                    — zonder programmeerkennis — en op hun eigen website of via een link delen
                    met klanten.
                  </GeoAnswer>
                </div>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <LinkButton href="/registreren" size="lg">
                    Maak je eigen rekentool
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                  <LinkButton href="/voorbeelden-rekentools" size="lg" variant="outline">
                    Bekijk voorbeelden
                  </LinkButton>
                </div>
              </div>

              <Reveal delay={150}>
                <WebsiteCalculatorMockup
                  siteUrl="vandijkkozijnen.nl"
                  bedrijfsnaam="Van Dijk Kozijnen"
                  productTitel="Bereken de prijs van je nieuwe kozijnen"
                  velden={[
                    { label: "Aantal kozijnen", waarde: "6" },
                    { label: "Type kozijn", waarde: "Draai-kiep" },
                    { label: "Materiaal", waarde: "Kunststof" },
                    { label: "Glas", waarde: "HR++" },
                    { label: "Montage", waarde: "Inclusief" },
                  ]}
                  resultaatLabel="Indicatie vanaf"
                  resultaatWaarde="€ 7.850"
                  cta="Ontvang mijn prijs"
                  rotate="sm:-rotate-1"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* WAT IS HET */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Reveal>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Wat is een rekentool precies?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Een rekentool vervangt het handmatig uitrekenen van een prijsindicatie door een
                vragenlijst die een bezoeker zelf invult. Bij een hovenier vult een bezoeker
                bijvoorbeeld de oppervlakte van de tuin, het gewenste type bestrating en of er
                grond afgevoerd moet worden. De rekentool combineert die antwoorden met de
                tarieven die de hovenier vooraf heeft ingesteld — uurtarief, materiaalprijzen,
                voorrijkosten — en toont direct een prijsindicatie. Vindt de bezoeker die
                indicatie realistisch, dan vraagt hij via dezelfde tool een officiële offerte aan.
              </p>
              <p className="mt-4 text-muted-foreground">
                Dat is een fundamenteel ander proces dan een contactformulier: bij een
                contactformulier weet de vakman pas na het eerste contact of een bezoeker een
                serieuze, passende klant is. Bij een rekentool weet de bezoeker dat zelf al vóórdat
                hij contact opneemt.
              </p>
            </Reveal>
          </div>
        </section>

        {/* SOORTEN REKENTOOLS */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Welke rekentools kun je maken?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Elk vakgebied heeft zijn eigen vragen en prijsopbouw. Kies een startpunt of bouw
              volledig zelf een rekentool op maat.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOELGROEPEN.map((d, i) => (
              <Reveal key={d.slug} delay={i * 80}>
                <Link
                  href={`/voor/${d.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Rekentool voor {d.naamMeervoud}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      Een prijsindicatie voor {d.projectVoorbeeld}, opgebouwd uit jouw eigen
                      tarieven en materialen.
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    Bekijken
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* HOE HET WERKT */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Hoe je in vier stappen een rekentool maakt
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal delay={0}>
                <StapCard
                  nummer={1}
                  icon={SlidersHorizontal}
                  titel="Stel je tarieven in"
                  tekst="Uurtarief, voorrijkosten, materiaalmarge en btw — eenmalig instellen, daarna gebruikt elke rekentool dezelfde basis."
                />
              </Reveal>
              <Reveal delay={100}>
                <StapCard
                  nummer={2}
                  icon={ListChecks}
                  titel="Kies je vragen en prijsregels"
                  tekst="Begin met een kant-en-klaar onderdeel (bijv. schutting of keukenopstelling) of bouw zelf vragen, keuzes en prijsregels op."
                />
              </Reveal>
              <Reveal delay={200}>
                <StapCard
                  nummer={3}
                  icon={Globe2}
                  titel="Plaats de tool op je site"
                  tekst="Deel de directe link of plaats de rekentool met een embedcode op je eigen website."
                />
              </Reveal>
              <Reveal delay={300}>
                <StapCard
                  nummer={4}
                  icon={Send}
                  titel="Ontvang de aanvraag"
                  tekst="Vraagt een klant een offerte aan, dan komt die met de exacte selectie binnen in je leads-overzicht."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* VERDIEPING / SPOKES */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Meer over rekentools
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal delay={0}>
              <VerdiepingKaart
                href="/voorbeelden-rekentools"
                titel="Voorbeelden van rekentools"
                tekst="Bekijk hoe een Kostenplan-rekentool eruitziet op de website van een hovenier, schuttingbedrijf of kozijnenbedrijf."
              />
            </Reveal>
            <Reveal delay={60}>
              <VerdiepingKaart
                href="/rekentool-templates"
                titel="Rekentool templates"
                tekst="Ontdek de sjablonen waarmee je direct kunt starten, per vakgebied."
              />
            </Reveal>
            <Reveal delay={120}>
              <VerdiepingKaart
                href="/rekentool-op-eigen-website"
                titel="Rekentool op je eigen website"
                tekst="De technische kant: hoe je een rekentool insluit op je eigen domein, met of zonder ontwikkelaar."
              />
            </Reveal>
            <Reveal delay={180}>
              <VerdiepingKaart
                href="/offerte-calculator"
                titel="Offerte calculator vs. offerteprogramma"
                tekst="Het verschil tussen software waarmee jij offertes typt, en een tool waarmee de klant zelf rekent."
              />
            </Reveal>
            <Reveal delay={240}>
              <VerdiepingKaart
                href="/prijs-calculator"
                titel="Klanten zelf een prijs laten berekenen"
                tekst="Waarom een vooraf zichtbare prijsindicatie leidt tot minder tijdverlies en serieuzere aanvragen."
              />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Liever eerst een uitgeschreven stappenplan lezen?{" "}
              <Link href="/kennisbank" className="font-medium text-primary hover:underline">
                Bekijk de kennisbank
              </Link>
              .
            </p>
          </Reveal>
        </section>

        <FaqSection
          faqs={FAQS}
          id="rekentool-faq"
          titel="Veelgestelde vragen over rekentools"
          intro="Antwoorden op de vragen die vakmensen ons het vaakst stellen voordat ze starten."
        />

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              </div>
              <h2 className="text-2xl font-semibold text-balance text-primary-foreground sm:text-3xl">
                Maak je eigen rekentool
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Binnen 5 minuten online, met je eerste 10 producten. Helemaal gratis te starten.
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

function StapCard({
  nummer,
  icon: Icon,
  titel,
  tekst,
}: {
  nummer: number;
  icon: React.ComponentType<{ className?: string }>;
  titel: string;
  tekst: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {nummer}
          </span>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{titel}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tekst}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function VerdiepingKaart({ href, titel, tekst }: { href: string; titel: string; tekst: string }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calculator className="h-4 w-4" />
        </span>
        <h3 className="mt-3 font-semibold text-foreground">{titel}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tekst}</p>
      </div>
      <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
        Lees meer
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
