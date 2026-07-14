import {
  ArrowRight,
  BadgeCheck,
  Check,
  Filter,
  Frown,
  MousePointerClick,
  Phone,
  Scale,
} from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
            <div
              className="animate-blob-drift absolute -bottom-24 right-1/2 h-[24rem] w-[24rem] translate-x-[60%] rounded-full bg-accent blur-3xl"
              style={{ animationDelay: "3s" }}
            />
          </div>

          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <span className="animate-fade-in-up inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Voor hoveniersbedrijven
              </span>
              <h1
                className="animate-fade-in-up mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl"
                style={{ animationDelay: "80ms" }}
              >
                Stop met urenlang offertes maken voor klanten die toch niet kopen.
              </h1>
              <p
                className="animate-fade-in-up mt-6 text-lg text-muted-foreground"
                style={{ animationDelay: "160ms" }}
              >
                Laat websitebezoekers zelf een prijsindicatie berekenen. Jij krijgt alleen nog
                aanvragen van serieuze klanten met een realistisch budget. Geen nutteloze
                belletjes, geen offerte-shoppers.
              </p>
              <div
                className="animate-fade-in-up mt-8 flex flex-col justify-center gap-3 sm:flex-row"
                style={{ animationDelay: "240ms" }}
              >
                <LinkButton href="/registreren" size="lg">
                  Start nu gratis
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="#voorbeeld" size="lg" variant="outline">
                  Bekijk een voorbeeld
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* PIJNPUNTEN */}
        <section className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Herken je deze tijdverslinders?
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Reveal delay={0}>
                <PainCard
                  icon={Scale}
                  title="De Vergelijker"
                  description="Klanten die alleen een offerte opvragen om jouw prijzen te gebruiken als onderhandelingsmiddel bij een andere hovenier."
                />
              </Reveal>
              <Reveal delay={100}>
                <PainCard
                  icon={Phone}
                  title="De Beller"
                  description={
                    <>
                      Mensen die je tijdens je werk bellen met de vraag: &ldquo;Wat kost een
                      metertje schutting ongeveer?&rdquo;, om vervolgens nooit meer iets te
                      laten horen.
                    </>
                  }
                />
              </Reveal>
              <Reveal delay={200}>
                <PainCard
                  icon={Frown}
                  title="De Schrikker"
                  description="Je steekt een uur in een prachtige, gedetailleerde offerte, maar de klant haakt af omdat hun budget onrealistisch laag was."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* OPLOSSING */}
        <section id="voorbeeld" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 className="text-2xl font-semibold text-balance text-foreground sm:text-3xl">
                Jouw nieuwe, automatische filter voor serieuze leads.
              </h2>
              <div className="mt-10 flex flex-col gap-8">
                <SolutionPoint
                  icon={MousePointerClick}
                  title="Klant rekent het zelf uit"
                  description="Bezoekers klikken op jouw link of website hun wensen aan (materialen en diensten) en zien direct een realistische prijsindicatie. Ze hoeven jou hiervoor niet te bellen."
                />
                <SolutionPoint
                  icon={Filter}
                  title="Natuurlijke selectie"
                  description="Past de prijs niet binnen hun budget? Dan klikken ze weg. Jij hebt er geen minuut tijd aan verspild."
                />
                <SolutionPoint
                  icon={BadgeCheck}
                  title="Alleen warme leads"
                  description="Past de prijs wél? Dan vraagt de klant via de tool een officiële offerte aan. Jij weet nu zeker dat deze persoon jouw tarieven al heeft geaccepteerd en écht wil kopen."
                />
              </div>
            </Reveal>

            <Reveal delay={150}>
              <CalculatorMockup />
            </Reveal>
          </div>
        </section>

        {/* VOORDELEN */}
        <section className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Wat levert dit je op?
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Reveal delay={0}>
                <BenefitItem title="Professionele uitstraling">
                  Je straalt direct transparantie en betrouwbaarheid uit naar je klanten.
                </BenefitItem>
              </Reveal>
              <Reveal delay={100}>
                <BenefitItem title="Focus op het echte werk">
                  Minder tijd achter de computer, meer tijd in de tuin.
                </BenefitItem>
              </Reveal>
              <Reveal delay={200}>
                <BenefitItem title="Conversie gaat omhoog">
                  De offertes die je nog wél maakt, worden veel vaker geaccepteerd omdat het
                  budget al is afgestemd.
                </BenefitItem>
              </Reveal>
            </div>
          </div>
        </section>

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
                Test het zelf. Binnen 5 minuten online.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                Voeg je 10 populairste producten of diensten toe en deel je rekentool direct
                met je klanten. Helemaal gratis.
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
                  Maak je eerste Kostenplan aan
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

function PainCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning/10 text-warning transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SolutionPoint({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function BenefitItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function CalculatorMockup() {
  return (
    <div className="relative mx-auto max-w-sm" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />
      <Card className="overflow-hidden shadow-xl transition-transform duration-500 hover:rotate-0 sm:rotate-1">
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="ml-2 truncate text-xs font-medium text-muted-foreground">
            jouwbedrijf.kostenplan.nl
          </span>
        </div>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Product
            </p>
            <p className="font-semibold text-foreground">Schutting plaatsen</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">Aantal meters</span>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm font-medium text-foreground">
                −
              </span>
              <span className="w-6 text-center text-sm font-semibold text-foreground">12</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm font-medium text-foreground">
                +
              </span>
            </div>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-primary" />
                Hardhouten palen
              </span>
              <span className="text-muted-foreground">+ € 18 / m1</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-primary" />
                Tussenschot planken
              </span>
              <span className="text-muted-foreground">+ € 24 / m1</span>
            </li>
          </ul>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground">Totale schatting</span>
            <span className="text-xl font-bold text-primary">€ 1.480,-</span>
          </div>

          <span className="flex w-full items-center justify-center rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">
            Offerte aanvragen
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
