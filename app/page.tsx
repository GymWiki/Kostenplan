import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Globe2,
  Kanban,
  LayoutTemplate,
  Mail,
  MessageCircle,
  Sparkles,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { FaqSection } from "@/app/components/marketing/faq-section";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { GoogleDataSection } from "@/app/components/marketing/google-data-section";
import { StructuredData } from "@/app/components/marketing/structured-data";
import { WebsiteCalculatorMockup } from "@/app/components/marketing/website-calculator-mockup";
import { ScrollCalculatorDemo } from "@/app/components/marketing/scroll-calculator-demo";
import { UseCaseSwitcher } from "@/app/components/marketing/use-case-switcher";
import { MarketingPricingTable } from "@/app/components/pricing/marketing-pricing-table";
import { LEAD_STATUS_LABELS } from "@/app/lib/leads";
import { CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates";

const TITLE = "Kostenplan | Maak een rekentool voor je website";
const DESCRIPTION =
  "Maak zonder programmeerkennis een professionele rekentool voor je website. Kies een sjabloon, pas je prijzen aan en laat klanten zelf hun prijs berekenen.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "website",
    // Een pagina die zelf een openGraph-object opgeeft, erft de
    // opengraph-image.tsx-bestandsconventie niet betrouwbaar automatisch —
    // expliciet verwijzen voorkomt dat social shares zonder afbeelding komen.
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

// Compacte scanregel i.p.v. een volledige icoon-grid-sectie (herontwerp
// "logisch geheel"): dit moet in één oogopslag geruststellen — "dit werkt
// ook voor mij" — zonder aandacht weg te nemen van de productdemo die
// direct erna komt. De rijkere "dit is hoe het eruitziet per vakgebied"-
// claim wordt verderop door de UseCaseSwitcher gedaan; deze regel is puur
// een snelle, doorklikbare bevestiging + interne links naar /voor/*.
const VAKGEBIEDEN: { label: string; href?: string }[] = [
  { label: "Tuin", href: "/voor/hoveniers" },
  { label: "Bestrating", href: "/voor/stratenmakers" },
  { label: "Schutting", href: "/voor/schuttingbedrijven" },
  { label: "Kozijnen", href: "/voor/kozijnen" },
  { label: "Veranda" },
  { label: "Verbouwing", href: "/voor/bouwbedrijven" },
  { label: "Schilderwerk", href: "/voor/schilders" },
  { label: "Maatwerk", href: "/voor/klusbedrijven" },
  { label: "Badkamer", href: "/voor/badkamerbedrijven" },
  { label: "Andere diensten", href: "/voor" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StructuredData />
      <SiteHeader />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
            <div
              className="animate-blob-drift absolute -bottom-24 right-1/2 h-[24rem] w-[24rem] translate-x-[60%] rounded-full bg-accent blur-3xl"
              style={{ animationDelay: "3s" }}
            />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-center lg:text-left">
                <span className="animate-fade-in-up inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Rekentool voor je website
                </span>
                <h1
                  className="animate-fade-in-up mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl"
                  style={{ animationDelay: "80ms" }}
                >
                  Maak een rekentool voor je website
                </h1>
                <p
                  className="animate-fade-in-up mt-6 text-lg text-muted-foreground"
                  style={{ animationDelay: "160ms" }}
                >
                  Laat klanten zelf hun prijs berekenen, zonder programmeerkennis. Jij ontvangt
                  aanvragen van mensen die al weten wat hun project ongeveer kost.
                </p>
                <div
                  className="animate-fade-in-up mt-6 text-left"
                  style={{ animationDelay: "200ms" }}
                >
                  <GeoAnswer>
                    Kostenplan is een platform waarmee vakmensen zelf een online rekentool voor
                    hun website bouwen. Bezoekers berekenen zelf een prijsindicatie; jij ontvangt
                    de aanvraag met de exacte selectie in je eigen leads-overzicht.
                  </GeoAnswer>
                </div>
                <div
                  className="animate-fade-in-up mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
                  style={{ animationDelay: "240ms" }}
                >
                  <LinkButton href="/registreren" size="lg">
                    Maak gratis een rekentool
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                  <LinkButton href="/voorbeelden-rekentools" size="lg" variant="outline">
                    Bekijk voorbeelden
                  </LinkButton>
                </div>
              </div>

              <Reveal delay={150}>
                <WebsiteCalculatorMockup
                  siteUrl="groenenzo.nl"
                  bedrijfsnaam="Groen & Zo Tuinen"
                  productTitel="Bereken de kosten van jouw tuin"
                  velden={[
                    { label: "Oppervlakte tuin", waarde: "85 m²" },
                    { label: "Bestrating", waarde: "Ja" },
                    { label: "Beplanting", waarde: "Ja" },
                    { label: "Schutting", waarde: "12 m1" },
                    { label: "Tuinverlichting", waarde: "Ja" },
                  ]}
                  resultaatLabel="Indicatieprijs"
                  resultaatWaarde="€ 8.250 – € 10.500"
                  cta="Offerte aanvragen"
                  rotate="sm:rotate-1"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* VOOR ELK VAKGEBIED (compacte scanregel) */}
        <section className="py-6">
          <div className="mx-auto max-w-4xl border-t border-border" />
          <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-4 sm:px-6">
            <span className="mr-1 text-sm font-medium text-muted-foreground">Rekentools voor:</span>
            {VAKGEBIEDEN.map((v) =>
              v.href ? (
                <Link
                  key={v.label}
                  href={v.href}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {v.label}
                </Link>
              ) : (
                <span
                  key={v.label}
                  className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground"
                >
                  {v.label}
                </span>
              )
            )}
          </div>
        </section>

        {/* PRODUCTDEMO (incl. "probeer het zelf" en de GEO-uitleg) */}
        <ScrollCalculatorDemo />

        {/* ZO WERKT HET */}
        <section className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Zo werkt het</h2>
              <p className="mt-3 text-muted-foreground">
                Van een leeg dashboard naar een werkende rekentool op je eigen website.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Reveal delay={0}>
                <StapCard
                  nummer={1}
                  icon={LayoutTemplate}
                  titel="Kies een sjabloon"
                  tekst="Begin met een bestaande rekentool voor jouw vakgebied of maak er zelf één vanaf nul."
                />
              </Reveal>
              <Reveal delay={100}>
                <StapCard
                  nummer={2}
                  icon={SlidersHorizontal}
                  titel="Pas hem aan"
                  tekst="Voeg je eigen producten, prijzen, vragen en berekeningen toe."
                />
              </Reveal>
              <Reveal delay={200}>
                <StapCard
                  nummer={3}
                  icon={Globe2}
                  titel="Zet hem op je website"
                  tekst="Plaats je rekentool eenvoudig op je eigen website en laat bezoekers zelf rekenen."
                />
              </Reveal>
            </div>
            <Reveal delay={260} className="mt-10 flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Bijvoorbeeld:</span>
                {CALCULATOR_TEMPLATES.map((template) => (
                  <span
                    key={template.id}
                    className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground"
                  >
                    {template.naam}
                  </span>
                ))}
              </div>
              <LinkButton href="/registreren" size="lg">
                Maak mijn rekentool
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </Reveal>
          </div>
        </section>

        {/* VOORBEELDEN PER VAKGEBIED */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-balance text-foreground sm:text-3xl">
                Eén platform. Ontelbaar veel rekentools.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Kostenplan is niet alleen een rekenprogramma voor intern gebruik — je laat de
                rekentool daadwerkelijk aan je klant zien, op je eigen website. Klik hieronder
                door de vakgebieden heen.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-12">
              <UseCaseSwitcher />
            </Reveal>
          </div>
        </section>

        {/* WAAROM KOSTENPLAN */}
        <section className="border-y border-border bg-secondary/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Waarom een rekentool op je website?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Herkenbaar: uren kwijt aan offertes voor mensen die toch niet kopen, of een
                aanvraag missen omdat je gewoon aan het werk was. Een rekentool lost dat op.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0}>
                <WaaromItem icon={Target} title="Meer relevante aanvragen">
                  Bezoekers zien vooraf wat een project ongeveer kost, dus alleen serieuze
                  aanvragen komen binnen.
                </WaaromItem>
              </Reveal>
              <Reveal delay={80}>
                <WaaromItem icon={Clock3} title="Minder tijd kwijt aan rekenen">
                  Je website rekent voor je, ook buiten kantooruren en zonder dat jij iets hoeft
                  te doen.
                </WaaromItem>
              </Reveal>
              <Reveal delay={160}>
                <WaaromItem icon={BadgeCheck} title="Nooit meer offerte-shoppers">
                  Wie een aanvraag doet, heeft jouw prijzen al gezien en geaccepteerd — geen tijd
                  meer kwijt aan mensen die toch niet boeken.
                </WaaromItem>
              </Reveal>
              <Reveal delay={240}>
                <WaaromItem icon={Sparkles} title="Professionele uitstraling">
                  Eigen logo en huisstijl op de rekentool, in plaats van een los contactformulier.
                </WaaromItem>
              </Reveal>
              <Reveal delay={320}>
                <WaaromItem icon={Wand2} title="Geen programmeerkennis nodig">
                  Maak en beheer je rekentool volledig vanuit Kostenplan, zonder developer of
                  externe hulp.
                </WaaromItem>
              </Reveal>
            </div>
          </div>
        </section>

        {/* LEADS / CRM */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <Reveal className="lg:order-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Kanban className="h-3.5 w-3.5 text-primary" />
                Leads &amp; Offertes
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-balance text-foreground sm:text-3xl">
                Nooit meer een aanvraag kwijt in je inbox.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Elke offerte-aanvraag vanuit je rekentool komt automatisch binnen in je eigen
                mini-CRM. Geen losse e-mails meer bijhouden — één overzichtelijk Kanban-bord met
                alle aanvragen en hun status.
              </p>
              <div className="mt-8 flex flex-col gap-6">
                <SolutionPoint
                  icon={Kanban}
                  title="Overzichtelijk Kanban-bord"
                  description="Sleep aanvragen eenvoudig van 'Nieuw' naar 'In behandeling', 'Offerte verstuurd', 'Gewonnen' of 'Verloren'. In één oogopslag zie je waar elke klant staat."
                  winst="Geen enkele aanvraag raakt meer zoek tussen je e-mails."
                />
                <SolutionPoint
                  icon={Clock3}
                  title="Status en pipeline-waarde bijhouden"
                  description="Zie direct de totale verwachte omzet van al je openstaande aanvragen, plus je conversieratio."
                  winst="Altijd inzicht in hoeveel omzet er nog in je pijplijn zit."
                />
                <SolutionPoint
                  icon={MessageCircle}
                  title="Direct contact vanuit het dashboard"
                  description="Bel, mail of open een WhatsApp-chat met één klik vanuit de aanvraag zelf — inclusief de exacte selectie en prijsindicatie van de klant."
                  winst="Sneller reageren dan de concurrent, zonder telefoonnummers over te typen."
                />
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Beschikbaar vanaf het{" "}
                <Link href="/#prijzen" className="font-medium text-primary hover:underline">
                  Plus-pakket
                </Link>
                .
              </p>
            </Reveal>

            <Reveal delay={150} className="lg:order-1">
              <LeadsMockup />
            </Reveal>
          </div>
        </section>

        {/* PRIJZEN */}
        <section id="prijzen" className="border-y border-border bg-secondary/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Simpele, eerlijke prijzen
              </h2>
              <p className="mt-3 text-muted-foreground">
                Begin gratis en groei mee. Maandelijks of jaarlijks opzegbaar, geen verplicht
                contract.
              </p>
            </Reveal>
            <div className="mt-12">
              <MarketingPricingTable />
            </div>
          </div>
        </section>

        <FaqSection />

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                <div
                  className="animate-blob-drift absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
                  style={{ animationDelay: "4s" }}
                />
              </div>
              <h2 className="text-2xl font-semibold text-balance text-primary-foreground sm:text-3xl">
                Laat je website voor je rekenen
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Geef bezoekers de mogelijkheid om zelf hun prijs te berekenen. Binnen 5 minuten
                online, helemaal gratis.
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

        <GoogleDataSection />
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

function WaaromItem({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function SolutionPoint({
  icon: Icon,
  title,
  description,
  winst,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  winst?: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {winst && (
          <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-primary">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Winst:</span> {winst}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

const MOCKUP_KOLOMMEN: { status: "NIEUW" | "IN_BEHANDELING" | "OFFERTE_VERSTUURD"; naam: string; bedrag: string }[][] = [
  [{ status: "NIEUW", naam: "Fam. de Vries", bedrag: "€ 890" }],
  [{ status: "IN_BEHANDELING", naam: "J. Bakker", bedrag: "€ 1.240" }],
  [
    { status: "OFFERTE_VERSTUURD", naam: "Tuinstudio Peters", bedrag: "€ 2.100" },
    { status: "OFFERTE_VERSTUURD", naam: "Fam. Willems", bedrag: "€ 3.200" },
  ],
];

function LeadsMockup() {
  return (
    <div className="relative mx-auto max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />
      <Card className="overflow-hidden shadow-xl transition-transform duration-500 hover:rotate-0 sm:-rotate-1">
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="ml-2 truncate text-xs font-medium text-muted-foreground">
            Leads &amp; Offertes
          </span>
        </div>
        <CardContent className="grid grid-cols-3 gap-2">
          {MOCKUP_KOLOMMEN.map((kolom, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <Badge variant="muted" className="text-[10px]">
                  {LEAD_STATUS_LABELS[kolom[0].status]}
                </Badge>
              </div>
              {kolom.map((kaart) => (
                <div
                  key={kaart.naam}
                  className="rounded-lg border border-border bg-card p-2 shadow-sm"
                >
                  <p className="truncate text-[11px] font-medium text-foreground">{kaart.naam}</p>
                  <p className="text-xs font-semibold text-primary">{kaart.bedrag}</p>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            E-mail
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </span>
        </div>
      </Card>
    </div>
  );
}
