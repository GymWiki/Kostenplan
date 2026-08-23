import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";
import { cn } from "@/app/lib/cn";

const TITLE = "Offerte calculator: automatisch offertes voorbereiden";
const DESCRIPTION =
  "Een offerte calculator laat klanten zelf een prijs berekenen én een offerte aanvragen. Ontdek het verschil met een offerteprogramma en hoe je offertes automatiseert.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/offerte-calculator" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/offerte-calculator",
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

const VERGELIJKING = [
  { aspect: "Wie vult hem in", programma: "De vakman zelf, achter de schermen", calculator: "De klant, op de website van de vakman" },
  { aspect: "Moment in het traject", programma: "Nadat er al contact is geweest", calculator: "Vóórdat er contact is geweest" },
  { aspect: "Resultaat", programma: "Een opgemaakt offertedocument", calculator: "Een prijsindicatie, gevolgd door een offerteaanvraag" },
  { aspect: "Werkt op de website van de klant", programma: "Nee — het is interne software", calculator: "Ja — dat is het hele doel" },
  { aspect: "Filtert niet-serieuze aanvragen", programma: "Nee, elke aanvraag kost eerst tijd om te beoordelen", calculator: "Ja, de klant ziet de prijs al vóór het contact" },
];

const FAQS = [
  {
    vraag: "Wat is een offerte calculator?",
    antwoord:
      "Een offerte calculator is een rekentool op de website van een vakman waarmee een bezoeker eerst zelf een prijsindicatie berekent, en vervolgens — als die indicatie past bij zijn budget — via dezelfde tool direct een offerte kan aanvragen. De aanvraag komt aan bij de vakman inclusief de exacte selectie die de klant heeft gemaakt.",
  },
  {
    vraag: "Kan ik een offerteaanvraag ontvangen na de berekening?",
    antwoord:
      "Ja. Aan het einde van elke berekening kan een bezoeker met één knop een offerte aanvragen. Die aanvraag komt binnen als lead, met de volledige berekening erbij, zodat er nooit dubbel werk nodig is om de eerder ingevulde gegevens opnieuw te achterhalen.",
  },
  {
    vraag: "Kan ik zelf bepalen welke vragen mijn klant krijgt?",
    antwoord:
      "Ja. Je stelt zelf in welke vragen worden gesteld — bijvoorbeeld afmetingen, materiaalkeuze of extra opties — en welke prijsregel bij elk antwoord hoort. Je kunt vragen ook voorwaardelijk maken, zodat bijvoorbeeld een vraag over een poort alleen verschijnt wanneer daar bij een eerdere vraag voor gekozen is.",
  },
  {
    vraag: "Kan ik verschillende producten en prijzen instellen?",
    antwoord:
      "Ja. Je kunt meerdere producten of onderdelen combineren binnen één rekentool — bijvoorbeeld bestrating, een schutting en kunstgras samen in een tuinaanleg-calculator — elk met een eigen prijsopbouw op basis van jouw tarieven.",
  },
  {
    vraag: "Vervangt een offerte calculator mijn offerteprogramma?",
    antwoord:
      "Niet per se. Een offerte calculator staat vóór in het traject: hij zorgt dat alleen serieuze, passende aanvragen bij je binnenkomen. Wat je daarna met die aanvraag doet — een formele offerte opstellen en versturen — kan nog steeds in je eigen offerteproces of -software gebeuren.",
  },
];

export default function OfferteCalculatorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs
        items={[
          { label: "Rekentool", href: "/rekentool" },
          { label: "Offerte calculator", href: "/offerte-calculator" },
        ]}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Offerte calculator
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Een offerte calculator: rekenen én aanvragen in één stap
            </h1>
            <div className="mt-6 text-left">
              <GeoAnswer>
                Een offerte calculator is een rekentool die naast een prijsindicatie ook direct
                een offerteaanvraag verzamelt: zodra een bezoeker tevreden is met de berekende
                prijs, vraagt hij via dezelfde tool een offerte aan. Dat is iets anders dan een
                offerteprogramma, waarmee een vakman zelf, achter de schermen, een offerte
                opstelt.
              </GeoAnswer>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/registreren" size="lg">
                Maak je offerte calculator
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/rekentool" size="lg" variant="outline">
                Wat is een rekentool?
              </LinkButton>
            </div>
          </Reveal>
        </section>

        {/* VERGELIJKING */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Offerte calculator vs. offerteprogramma
              </h2>
              <p className="mt-3 text-muted-foreground">
                Twee verschillende stappen in hetzelfde traject — geen vervanging van elkaar.
              </p>
            </Reveal>
            <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-semibold text-foreground">Aspect</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Offerteprogramma</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Offerte calculator</th>
                  </tr>
                </thead>
                <tbody>
                  {VERGELIJKING.map((rij, i) => (
                    <tr
                      key={rij.aspect}
                      className={cn(i !== VERGELIJKING.length - 1 && "border-b border-border")}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{rij.aspect}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="flex items-start gap-2">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                          {rij.programma}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {rij.calculator}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* OFFERTES AUTOMATISEREN */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Hoe je het offertetraject automatiseert
            </h2>
            <p className="mt-4 text-muted-foreground">
              Zonder offerte calculator beoordeel je elke aanvraag pas ná binnenkomst: bellen,
              afspreken of opmeten, en dan pas een prijs noemen. Met een offerte calculator draai
              je die volgorde om. De klant ziet eerst zelf een prijsindicatie op basis van zijn
              eigen keuzes. Wie doorzet naar een aanvraag, heeft je tarieven al geaccepteerd —
              dat scheelt het uitzoekwerk dat normaal bij elke losse aanvraag hoort.
            </p>
            <p className="mt-4 text-muted-foreground">
              Elke aanvraag komt terecht in een leads-overzicht, inclusief de exacte selectie en
              berekening van de klant. Vandaar kun je de aanvraag opvolgen en, waar nodig, alsnog
              een formele offerte opstellen in je eigen proces — met alle gegevens al voorhanden.
            </p>
          </Reveal>
        </section>

        <FaqSection
          faqs={FAQS}
          id="offerte-calculator-faq"
          titel="Veelgestelde vragen over de offerte calculator"
          intro="Wat een offerte calculator wel en niet voor je regelt."
        />

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Meer weten over hoe klanten zelf een prijs berekenen?{" "}
              <Link href="/prijs-calculator" className="font-medium text-primary hover:underline">
                Bekijk de prijs calculator-pagina
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
                Laat je klanten zelf rekenen én aanvragen
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Zet vandaag nog je eerste offerte calculator live. Gratis te starten.
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
