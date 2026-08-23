import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, Kanban, Send } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";

const TITLE = "Online een offerte maken, zonder losse PDF's";
const DESCRIPTION =
  "Zo werkt online offerte maken: van prijsberekening door je klant tot een offerte die hij via een eigen link bekijkt en digitaal accepteert.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/online-offerte-maken" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/online-offerte-maken",
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
    vraag: "Wat is online een offerte maken?",
    antwoord:
      "Online een offerte maken betekent dat een offerte niet als los document wordt opgesteld en gemaild, maar wordt samengesteld vanuit een aanvraag die al via een rekentool is binnengekomen, en vervolgens via een eigen, persoonlijke link met de klant wordt gedeeld — die kan de offerte in de browser bekijken, zonder bijlage te hoeven openen.",
  },
  {
    vraag: "Kan een klant de offerte online accepteren of afwijzen?",
    antwoord:
      "Ja. Via de persoonlijke offertelink kan de klant de offerte digitaal accepteren of afwijzen. De status daarvan is voor de vakman direct zichtbaar in het leads-overzicht, zonder dat daar een telefoontje of e-mail voor nodig is.",
  },
  {
    vraag: "Kan ik een offerte nog aanpassen voordat ik hem verstuur?",
    antwoord:
      "Ja. Een binnengekomen aanvraag wordt eerst omgezet in een offerte die je kunt controleren en aanpassen — bijvoorbeeld een regel toevoegen of een bedrag corrigeren — voordat je hem daadwerkelijk met de klant deelt.",
  },
  {
    vraag: "Wat gebeurt er met een al verstuurde offerte als ik mijn tarieven wijzig?",
    antwoord:
      "Niets. Een verstuurde offerte legt de prijs vast op het moment van versturen. Wijzig je daarna je tarieven, dan gebruiken alleen nieuwe berekeningen en offertes de bijgewerkte prijzen — een offerte die een klant al heeft ontvangen, blijft ongewijzigd geldig tot de vervaldatum.",
  },
  {
    vraag: "Heb ik nog aparte offertesoftware nodig?",
    antwoord:
      "Niet voor offertes die voortkomen uit een berekening op je rekentool — die doorloop je volledig binnen hetzelfde overzicht, van aanvraag tot geaccepteerde offerte. Voor offertes buiten dat traject om kun je uiteraard je eigen bestaande proces blijven gebruiken.",
  },
];

export default function OnlineOfferteMakenPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs
        items={[
          { label: "Rekentool", href: "/rekentool" },
          { label: "Online offerte maken", href: "/online-offerte-maken" },
        ]}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Online offerte maken
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Van prijsberekening naar geaccepteerde offerte, zonder losse PDF&apos;s
            </h1>
            <div className="mt-6 text-left">
              <GeoAnswer>
                Online een offerte maken betekent dat je een aanvraag die al via een rekentool is
                binnengekomen omzet in een offerte, die de klant vervolgens via een eigen link
                online bekijkt en digitaal accepteert — zonder dat er een los document gemaild
                hoeft te worden.
              </GeoAnswer>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/registreren" size="lg">
                Start gratis
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/offerte-calculator" size="lg" variant="outline">
                Hoe de aanvraag ontstaat
              </LinkButton>
            </div>
          </Reveal>
        </section>

        {/* TRAJECT */}
        <section className="border-y border-border bg-secondary/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Van berekening tot geaccepteerde offerte
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Reveal delay={0}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Kanban className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">Aanvraag komt binnen</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Een klant berekent zelf een prijs en vraagt een offerte aan. De aanvraag
                        verschijnt met de volledige selectie in je leads-overzicht.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              <Reveal delay={100}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Send className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">Offerte controleren en versturen</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Je zet de aanvraag om in een offerte, past aan waar nodig en deelt een
                        persoonlijke link met de klant.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              <Reveal delay={200}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileCheck2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">Klant accepteert online</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        De klant bekijkt de offerte via de link en accepteert of wijst hem af — de
                        status is direct zichtbaar in jouw overzicht.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        <FaqSection
          faqs={FAQS}
          id="online-offerte-faq"
          titel="Veelgestelde vragen over online offertes"
          intro="Wat er gebeurt tussen een aanvraag en een geaccepteerde offerte."
        />

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Wil je eerst weten hoe de aanvraag zelf ontstaat?{" "}
              <Link href="/offerte-calculator" className="font-medium text-primary hover:underline">
                Lees over de offerte calculator
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
                Zet je hele offertetraject online
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Van eerste berekening tot geaccepteerde offerte. Gratis te starten.
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
