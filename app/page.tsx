import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { lpFontClasses } from "@/app/components/landing/fonts";
import "@/app/components/landing/landing.css";
import { LandingSchema } from "@/app/components/landing/landing-schema";
import { LpHeader } from "@/app/components/landing/lp-header";
import { LpFooter } from "@/app/components/landing/lp-footer";
import { Positie } from "@/app/components/landing/maat";
import { CtaLink } from "@/app/components/landing/cta-link";
import { WebsiteInvoer } from "@/app/components/landing/website-invoer";
import { HeroDemo } from "@/app/components/landing/hero-demo";
import { ProbleemModel } from "@/app/components/landing/probleem-model";
import { SectieZoWerktHet } from "@/app/components/landing/sectie-zo-werkt-het";
import { SectieAanvragen } from "@/app/components/landing/sectie-aanvragen";
import { SectiePrijzen } from "@/app/components/landing/sectie-prijzen";
import { SectieVragen } from "@/app/components/landing/sectie-vragen";
import { SectieAfsluiter } from "@/app/components/landing/sectie-afsluiter";
import { GoogleDataSection } from "@/app/components/marketing/google-data-section";
import { DEFINITIE, KOPREGEL, WEBSITEBOUWERS } from "@/app/lib/landing/feiten";

const TITLE = "Prijscalculator voor hoveniers | Kostenplan";
const DESCRIPTION = "Online rekentool voor hoveniers: je klanten berekenen zelf de prijs van een schutting, terras of gazon en sturen een aanvraag. Gratis proberen.";

export const viewport: Viewport = { themeColor: "#f3f4ee", colorScheme: "light" };

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
    images: [{ url: "/api/og/landing", width: 1200, height: 630, alt: "Kostenplan: je klant weet de prijs al voordat hij belt." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/api/og/landing"] },
};

const link = "font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4";

export default function Home() {
  return (
    <div data-lp className={`lp ${lpFontClasses} flex min-h-screen flex-col`}>
      <LandingSchema />
      <LpHeader />

      <main id="main-content" className="flex-1">
        {/* 1 · HERO */}
        <div className="lp-licht">
        <section aria-labelledby="h-hero" className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
            <div className="flex flex-col">
              <Positie nr="01" label="Rekentool voor hoveniers" />
              <h1 id="h-hero" className="mt-5 text-5xl font-semibold leading-[1] sm:text-6xl lg:text-[4.5rem]">
                {KOPREGEL}
              </h1>
              <p className="lp-in mt-6 max-w-xl text-lg leading-relaxed [animation-delay:60ms]">{DEFINITIE}</p>
              <div className="lp-in mt-8 flex flex-col gap-6 [animation-delay:140ms]">
                <CtaLink href="/probeer" bron="hero" pijl className="w-full sm:w-fit sm:text-lg">
                  Maak je rekentool — gratis, geen account nodig
                </CtaLink>
                <div className="border-t border-lp-lijn pt-5">
                  <WebsiteInvoer bron="hero" />
                </div>
              </div>
              <p className="lp-in mt-6 font-lp-maat text-[11px] leading-relaxed tracking-wider text-lp-inkt-2">
                Werkt op {WEBSITEBOUWERS.join(", ")} en elke andere website
              </p>
            </div>
            <div className="lp-in [animation-delay:200ms]">
              <HeroDemo />
            </div>
          </div>
        </section>
        </div>

        {/* 2 · HET PROBLEEM */}
        <section id="probleem" aria-labelledby="h-probleem" className="px-3 py-2 sm:px-6">
          <div className="mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-lp-papier-2 grid max-w-7xl gap-12 px-5 py-16 sm:px-12 sm:py-28 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Positie nr="02" label="Het probleem" />
              <h2 id="h-probleem" className="mt-4 text-5xl font-semibold leading-[0.95] sm:text-7xl lg:text-[5.5rem]">
                ’s Avonds nog offertes uitrekenen.
              </h2>
              <ul className="mt-10 max-w-xl divide-y divide-lp-rand border-y border-lp-rand text-xl">
                {[
                  "Na een dag werken nog prijzen uitrekenen voor aanvragen.",
                  "Prijsaanvragen van mensen die daarna niets afnemen.",
                  "Bellen over een prijs die je klant te hoog vindt.",
                ].map((t) => (
                  <li key={t} className="flex gap-4 py-4">
                    <span aria-hidden="true" className="mt-3 h-px w-6 shrink-0 bg-lp-oker-donker" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-xl text-lg text-lp-inkt-2">
                Met een rekentool op je website ziet je klant de prijs voordat hij contact opneemt. Wie dan nog belt, weet wat het ongeveer kost.{" "}
                <Link href="/features/prijsindicatie-tool" className={link}>
                  Hoe een prijsindicatie werkt
                </Link>
                .
              </p>
            </div>
            <div className="lg:col-span-5 lg:mt-28">
              <ProbleemModel />
            </div>
          </div>
        </section>

        {/* 3 · ZO WERKT HET (slider; bevat ook de vroegere secties 4 en 7) */}
        <SectieZoWerktHet />

        {/* 4 · KLANT EN AANVRAAG (was 5 + 6) */}
        <SectieAanvragen />

        {/* 5 · PRIJZEN */}
        <SectiePrijzen />

        {/* 6 · VRAGEN */}
        <SectieVragen />

        {/* 7 · AFSLUITER */}
        <SectieAfsluiter />

        {/* Uitleg over Google-gegevens (vereist voor de Google OAuth-verificatie van "Inloggen met Google") */}
        <GoogleDataSection />
      </main>

      <LpFooter />
    </div>
  );
}
