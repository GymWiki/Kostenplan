import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { WebsiteCalculatorMockup, type MockupVeld } from "@/app/components/marketing/website-calculator-mockup";

const TITLE = "Voorbeelden van rekentools voor websites";
const DESCRIPTION =
  "Bekijk voorbeelden van rekentools voor hoveniers, bouwbedrijven, schuttingbedrijven, kozijnenbedrijven en andere vakmensen.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/voorbeelden-rekentools" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/voorbeelden-rekentools",
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

type Voorbeeld = {
  siteUrl: string;
  bedrijfsnaam: string;
  branche: string;
  productTitel: string;
  velden: MockupVeld[];
  resultaatLabel?: string;
  resultaatWaarde: string;
  cta: string;
  tekst: string;
  linkHref: string;
  linkLabel: string;
};

const VOORBEELDEN: Voorbeeld[] = [
  {
    siteUrl: "groenenzo.nl",
    bedrijfsnaam: "Groen & Zo Tuinen",
    branche: "Hovenier",
    productTitel: "Bereken de kosten van jouw tuin",
    velden: [
      { label: "Oppervlakte tuin", waarde: "85 m²" },
      { label: "Bestrating", waarde: "Ja" },
      { label: "Beplanting", waarde: "Ja" },
      { label: "Schutting", waarde: "12 m1" },
      { label: "Tuinverlichting", waarde: "Ja" },
    ],
    resultaatLabel: "Indicatieprijs",
    resultaatWaarde: "€ 8.250 – € 10.500",
    cta: "Offerte aanvragen",
    tekst:
      "Groen & Zo Tuinen laat bezoekers hun complete tuinproject samenstellen — bestrating, beplanting, schutting en verlichting — en toont direct een prijsrange in plaats van één vast bedrag, precies zoals het er in de praktijk ook uitziet.",
    linkHref: "/voor/hoveniers",
    linkLabel: "Bekijk de rekentool voor hoveniers",
  },
  {
    siteUrl: "schuttingdirect.nl",
    bedrijfsnaam: "SchuttingDirect",
    branche: "Schuttingbedrijf",
    productTitel: "Bereken jouw schutting",
    velden: [
      { label: "Lengte", waarde: "18 m1" },
      { label: "Hoogte", waarde: "180 cm" },
      { label: "Materiaal", waarde: "Hardhout" },
      { label: "Aantal poorten", waarde: "1" },
      { label: "Montage", waarde: "Inclusief" },
    ],
    resultaatLabel: "Vanaf",
    resultaatWaarde: "€ 2.950",
    cta: "Vraag offerte aan",
    tekst:
      "SchuttingDirect rekent per strekkende meter en telt een poort en montage automatisch mee als de klant die opties selecteert — zo blijft de eerste indicatie realistisch zonder dat de klant zelf hoeft te rekenen.",
    linkHref: "/voor/schuttingbedrijven",
    linkLabel: "Bekijk de rekentool voor schuttingbedrijven",
  },
  {
    siteUrl: "vandijkkozijnen.nl",
    bedrijfsnaam: "Van Dijk Kozijnen",
    branche: "Kozijnenbedrijf",
    productTitel: "Bereken de prijs van je nieuwe kozijnen",
    velden: [
      { label: "Aantal kozijnen", waarde: "6" },
      { label: "Type kozijn", waarde: "Draai-kiep" },
      { label: "Materiaal", waarde: "Kunststof" },
      { label: "Glas", waarde: "HR++" },
      { label: "Montage", waarde: "Inclusief" },
    ],
    resultaatLabel: "Indicatie vanaf",
    resultaatWaarde: "€ 7.850",
    cta: "Ontvang mijn prijs",
    tekst:
      "Van Dijk Kozijnen rekent per kozijn op basis van afmetingen, materiaal en glassoort — een bezoeker die aan het oriënteren is, weet zo al vóór het eerste contact welke orde van grootte hij mag verwachten.",
    linkHref: "/voor/kozijnen",
    linkLabel: "Bekijk de rekentool voor kozijnenbedrijven",
  },
  {
    siteUrl: "bestratingpro.nl",
    bedrijfsnaam: "Bestrating Pro",
    branche: "Stratenmaker",
    productTitel: "Bereken de kosten van je bestrating",
    velden: [
      { label: "Aantal m²", waarde: "60 m²" },
      { label: "Type bestrating", waarde: "Gebakken klinkers" },
      { label: "Opsluitbanden", waarde: "Ja" },
      { label: "Grondwerk", waarde: "Ja" },
      { label: "Afvoer oude bestrating", waarde: "Nee" },
    ],
    resultaatLabel: "Indicatie",
    resultaatWaarde: "€ 4.250",
    cta: "Offerte aanvragen",
    tekst:
      "Bestrating Pro toont grondwerk en opsluitbanden als losse regels binnen dezelfde berekening, zodat de klant precies ziet waaruit de prijs is opgebouwd in plaats van alleen een totaalbedrag.",
    linkHref: "/voor/stratenmakers",
    linkLabel: "Bekijk de rekentool voor stratenmakers",
  },
];

export default function VoorbeeldenRekentoolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Voorbeelden van rekentools", href: "/voorbeelden-rekentools" }]} />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Voorbeelden
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {TITLE}
              </h1>
              <div className="mt-6 text-left">
                <GeoAnswer>
                  Deze voorbeelden laten zien hoe een Kostenplan-rekentool op de website van een
                  vakbedrijf kan worden gebruikt: de omliggende website is fictief, maar de
                  rekentool zelf is de echte Kostenplan-rekentool zoals je die ook zelf kunt
                  bouwen en op je eigen website plaatsen.
                </GeoAnswer>
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/registreren" size="lg">
                  Maak gratis een rekentool
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/rekentool-templates" size="lg" variant="outline">
                  Bekijk templates
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* VOORBEELDEN */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 sm:px-6">
            {VOORBEELDEN.map((voorbeeld, i) => (
              <Reveal key={voorbeeld.siteUrl} delay={i * 80}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <WebsiteCalculatorMockup
                    siteUrl={voorbeeld.siteUrl}
                    bedrijfsnaam={voorbeeld.bedrijfsnaam}
                    productTitel={voorbeeld.productTitel}
                    velden={voorbeeld.velden}
                    resultaatLabel={voorbeeld.resultaatLabel}
                    resultaatWaarde={voorbeeld.resultaatWaarde}
                    cta={voorbeeld.cta}
                  />
                  <div>
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                      {voorbeeld.branche}
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold text-balance text-foreground">
                      {voorbeeld.bedrijfsnaam}
                    </h2>
                    <p className="mt-3 text-muted-foreground">{voorbeeld.tekst}</p>
                    <Link
                      href={voorbeeld.linkHref}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {voorbeeld.linkLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              </div>
              <h2 className="text-2xl font-semibold text-balance text-primary-foreground sm:text-3xl">
                Maak jouw eigen rekentool
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
                  Maak gratis een rekentool
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
