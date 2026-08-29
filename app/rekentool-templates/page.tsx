import type { Metadata } from "next";
import { ArrowRight, Layers, Puzzle } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";
import { getProductIcon } from "@/app/lib/icons";
import { CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates";
import { MODULAIRE_CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates-modulair";
import { onderdeelTemplateById } from "@/app/lib/calculator-engine/templates-onderdeel";

const TITLE = "Rekentool templates voor vakbedrijven";
const DESCRIPTION =
  "Bekijk de kant-en-klare rekentool templates in Kostenplan, per vakgebied — van tuinaanleg tot kozijnen. Pas een sjabloon aan met je eigen prijzen en zet 'm op je website.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/rekentool-templates" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/rekentool-templates",
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
    vraag: "Ben ik verplicht om een template te gebruiken?",
    antwoord:
      "Nee. Je kunt ook helemaal vanaf 0 beginnen met een lege rekentool. Een template is puur een startpunt — een kant-en-klare set vragen en prijsregels die je daarna volledig zelf aanpast.",
  },
  {
    vraag: "Kan ik een bestaande template aanpassen aan mijn eigen bedrijf?",
    antwoord:
      "Ja. Na het aanmaken vanuit een template pas je alle vragen, prijzen, materialen en voorwaarden aan naar jouw eigen tarieven — een template stelt alleen een startopzet voor, geen vaste structuur.",
  },
  {
    vraag: "Wat is het verschil tussen een gewone template en een 'modulaire' template?",
    antwoord:
      "Een gewone template levert één rekentool voor één type project (bijvoorbeeld alleen bestrating). Een modulaire template combineert meerdere zelfstandige onderdelen tot één rekentool met één totaalprijs, bijvoorbeeld een complete tuin die is opgebouwd uit bestrating, schutting, kunstgras, beplanting en grondwerk.",
  },
];

// Render-helper i.p.v. component-variabele in de render-body (zie ook
// app/dashboard/tools/nieuw/template-card.tsx): react-hooks/static-components
// signaleert een dynamisch-opgezocht icoon dat als JSX-tag wordt gebruikt
// binnen een component-body, ook al is de referentie stabiel.
function templateIcon(iconNaam: string, className: string) {
  const Icon = getProductIcon(iconNaam) ?? Puzzle;
  return <Icon className={className} />;
}

export default function RekentoolTemplatesPage() {
  const vlakkeTemplates = CALCULATOR_TEMPLATES;
  const modulaireTemplates = MODULAIRE_CALCULATOR_TEMPLATES.map((t) => ({
    ...t,
    onderdeelNamen: t.onderdeelTemplateIds.map((id) => onderdeelTemplateById(id)?.naam).filter((n): n is string => n != null),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Rekentool templates", href: "/rekentool-templates" }]} />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Templates
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {TITLE}
              </h1>
              <div className="mt-6 text-left">
                <GeoAnswer>
                  Kostenplan levert kant-en-klare rekentool templates per vakgebied — elke
                  template is een volledig werkende rekentool met vragen en prijsregels die je na
                  het aanmaken naar eigen tarieven aanpast. Je bent nooit verplicht een template
                  te gebruiken; zelf vanaf 0 beginnen kan ook.
                </GeoAnswer>
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/registreren" size="lg">
                  Maak gratis een rekentool
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/voorbeelden-rekentools" size="lg" variant="outline">
                  Bekijk voorbeelden
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* MODULAIRE TEMPLATES */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Complete projecten uit meerdere onderdelen
              </h2>
              <p className="mt-3 text-muted-foreground">
                Deze templates combineren meerdere zelfstandige onderdelen tot één rekentool met
                één totaalprijs.
              </p>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modulaireTemplates.map((template, i) => (
                <Reveal key={template.id} delay={i * 80}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {templateIcon(template.icoon, "h-5 w-5")}
                        </span>
                        <Badge variant="muted" className="shrink-0 gap-1">
                          <Layers className="h-3 w-3" aria-hidden="true" />
                          {template.onderdeelTemplateIds.length} onderdelen
                        </Badge>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{template.naam}</p>
                        <p className="text-xs text-muted-foreground">{template.categorie}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.beschrijving}</p>
                      {template.onderdeelNamen.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {template.onderdeelNamen.map((naam) => (
                            <span
                              key={naam}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {naam}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* VLAKKE TEMPLATES */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Templates voor één type project
            </h2>
            <p className="mt-3 text-muted-foreground">
              Losse templates voor wie met één rekentool voor één dienst wil starten.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vlakkeTemplates.map((template, i) => (
              <Reveal key={template.id} delay={i * 80}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {templateIcon(template.icoon, "h-5 w-5")}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{template.naam}</p>
                      <p className="text-xs text-muted-foreground">{template.categorie}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.beschrijving}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <FaqSection
          faqs={FAQS}
          id="templates-faq"
          titel="Veelgestelde vragen over templates"
          intro="Wat je wilt weten voordat je met een sjabloon start."
        />

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              </div>
              <h2 className="text-2xl font-semibold text-balance text-primary-foreground sm:text-3xl">
                Kies een sjabloon en pas het aan
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
