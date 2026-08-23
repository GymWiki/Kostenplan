import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Code2, Link2, Smartphone } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";

const TITLE = "Rekentool op je eigen website plaatsen";
const DESCRIPTION =
  "Zo voeg je een rekentool toe aan je eigen website: met een korte embedcode of een directe link, zonder ontwikkelaar of hosting. Werkt op WordPress, Wix en elk ander platform.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/rekentool-op-eigen-website" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/rekentool-op-eigen-website",
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
    vraag: "Werkt een Kostenplan-rekentool op WordPress, Wix of Squarespace?",
    antwoord:
      "Ja. De embedcode is een standaard HTML-iframe, dat werkt op elk platform dat aangepaste HTML toestaat — waaronder WordPress (via een HTML-blok), Wix, Squarespace en zelfgebouwde websites. Er is geen plugin nodig.",
  },
  {
    vraag: "Moet ik zelf kunnen programmeren om de rekentool te plaatsen?",
    antwoord:
      "Nee. Je kopieert één stukje code vanuit je Kostenplan-dashboard en plakt dat in een HTML- of embed-blok van je website-bouwer. Dat is dezelfde handeling als het insluiten van bijvoorbeeld een YouTube-video.",
  },
  {
    vraag: "Past de hoogte van de rekentool zich automatisch aan?",
    antwoord:
      "Ja. De ingesloten rekentool stuurt zijn eigen hoogte door aan de pagina waarop hij staat, zodat er nooit een lege ruimte onder de tool overblijft of een scrollbalk ontstaat, ook niet als een bezoeker extra vragen te zien krijgt.",
  },
  {
    vraag: "Kan ik de rekentool ook delen zonder hem op mijn website te plaatsen?",
    antwoord:
      "Ja. Elke rekentool heeft ook een eigen, directe link (bijvoorbeeld in je e-mailhandtekening, op social media of in een Google Bedrijfsprofiel) die los van je website werkt — insluiten met een embedcode is dus een keuze, geen vereiste.",
  },
  {
    vraag: "Neemt de rekentool de huisstijl van mijn website over?",
    antwoord:
      "De rekentool gebruikt je eigen logo en kleuren zoals je die in Kostenplan instelt, zodat hij visueel bij je merk past. Hij erft niet automatisch het lettertype of exacte kleurschema van je website zelf, omdat die buiten de iframe valt.",
  },
];

export default function RekentoolOpEigenWebsitePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs
        items={[
          { label: "Rekentool", href: "/rekentool" },
          { label: "Op je eigen website", href: "/rekentool-op-eigen-website" },
        ]}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Rekentool op je website
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Zo plaats je een rekentool op je eigen website
            </h1>
            <div className="mt-6 text-left">
              <GeoAnswer>
                Je voegt een rekentool aan je website toe door hem in Kostenplan te bouwen en
                daarna óf een korte embedcode op je eigen pagina te plakken, óf simpelweg naar de
                directe link van je rekentool te verwijzen. Er is geen hosting, server of
                ontwikkelaar voor nodig.
              </GeoAnswer>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/registreren" size="lg">
                Maak je rekentool
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/rekentool" size="lg" variant="outline">
                Wat is een rekentool?
              </LinkButton>
            </div>
          </Reveal>
        </section>

        {/* TWEE MANIEREN */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Twee manieren om je rekentool te delen
              </h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal delay={0}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Link2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">Directe link</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Elke rekentool krijgt een eigen webadres. Plaats die link als knop of
                        menu-item op je website, deel hem in je e-mailhandtekening of op social
                        media — zonder technische stappen.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              <Reveal delay={100}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Code2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">Embedcode (iframe)</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Sluit de rekentool rechtstreeks in het midden van je eigen pagina in, zodat
                        een bezoeker je website nooit verlaat. De hoogte past zich automatisch aan
                        de inhoud aan.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* STAPPENPLAN */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              In vijf stappen live op je website
            </h2>
          </Reveal>
          <ol className="mt-10 flex flex-col gap-6">
            {[
              {
                titel: "Bouw je rekentool in Kostenplan",
                tekst: "Stel je vragen, prijsregels en huisstijl in via de visuele bouwer.",
              },
              {
                titel: "Publiceer de rekentool",
                tekst: "Zet de rekentool live zodra je tevreden bent met de proefberekening.",
              },
              {
                titel: "Kopieer de embedcode",
                tekst: "Ga naar het insluiten-tabblad van je rekentool en kopieer de kant-en-klare code.",
              },
              {
                titel: "Plak de code in je website-bouwer",
                tekst: "Voeg een HTML- of embed-blok toe op de gewenste pagina en plak de code erin.",
              },
              {
                titel: "Test op desktop én mobiel",
                tekst: "Controleer of de rekentool goed leesbaar is en de hoogte correct meeschaalt.",
              },
            ].map((stap, i) => (
              <Reveal key={stap.titel} delay={i * 60}>
                <li className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{stap.titel}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stap.tekst}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* MOBIEL */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-4 sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Werkt net zo goed op een telefoon
            </h2>
            <p className="text-muted-foreground">
              De meeste bezoekers vullen een rekentool onderweg in, op een telefoon. De
              rekentool schaalt daarom automatisch mee met het scherm waarop hij wordt bekeken —
              zowel via de directe link als ingesloten op je eigen website.
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Geen aparte mobiele versie nodig.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Zelfde vragen en prijzen, op elk scherm.
              </li>
            </ul>
          </div>
        </section>

        <FaqSection
          faqs={FAQS}
          id="embed-faq"
          titel="Veelgestelde vragen over insluiten"
          intro="Alles wat je wilt weten voordat je de rekentool op je website plaatst."
        />

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Benieuwd wat een rekentool voor jouw vakgebied concreet oplevert?{" "}
              <Link href="/rekentool" className="font-medium text-primary hover:underline">
                Bekijk de rekentool-pagina
              </Link>{" "}
              of{" "}
              <Link href="/offerte-calculator" className="font-medium text-primary hover:underline">
                lees het verschil met een offerteprogramma
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
                Bouw je rekentool en plaats hem vandaag nog
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Gratis starten met tot 10 producten, geen creditcard nodig.
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
