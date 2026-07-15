import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { DOELGROEPEN, type Doelgroep } from "@/app/lib/doelgroepen";

// Gedeelde template voor de doelgroep-landingspagina's onder /voor/[slug].
// Elke pagina levert alleen zijn eigen Doelgroep-config aan (zie
// app/lib/doelgroepen.ts) en krijgt daarmee een unieke URL, title en H1,
// terwijl de opmaak en de onderlinge cross-links hier centraal blijven.
export function DoelgroepLanding({ doelgroep }: { doelgroep: Doelgroep }) {
  const andereDoelgroepen = DOELGROEPEN.filter((d) => d.slug !== doelgroep.slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-blob-drift absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-primary/15 blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Voor {doelgroep.naamMeervoud}
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {doelgroep.h1}
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">{doelgroep.intro}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/registreren" size="lg">
                  Start nu gratis
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/prijzen" size="lg" variant="outline">
                  Bekijk de prijzen
                </LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* VOORDELEN */}
        <section className="border-y border-border bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Waarom {doelgroep.naamMeervoud} voor Kostenplan kiezen
              </h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {doelgroep.voordelen.map((voordeel, i) => (
                <Reveal key={voordeel.titel} delay={i * 100}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-foreground">{voordeel.titel}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {voordeel.tekst}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ANDERE DOELGROEPEN */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Ook een rekentool voor andere vakmensen
            </h2>
            <p className="mt-3 text-muted-foreground">
              Kostenplan werkt voor elk vakgebied waarin je klanten vooraf een prijsindicatie
              willen zien.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {andereDoelgroepen.map((d) => (
              <Reveal key={d.slug}>
                <Link
                  href={`/voor/${d.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Voor {d.naamMeervoud}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      Prijsindicaties voor {d.projectVoorbeeld}, direct vanaf je website.
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

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lg sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="animate-blob-drift absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
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
