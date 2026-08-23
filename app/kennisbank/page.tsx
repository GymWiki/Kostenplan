import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { KENNISBANK_ARTIKELEN } from "@/app/lib/kennisbank";

const TITLE = "Kennisbank: rekentools, offertes en prijsberekening";
const DESCRIPTION =
  "Praktische artikelen over het bouwen van een rekentool, het automatiseren van offertes en het online laten berekenen van prijzen door klanten.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/kennisbank" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/kennisbank",
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

export default function KennisbankPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Kennisbank", href: "/kennisbank" }]} />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Kennisbank
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Praktische uitleg over rekentools, offertes automatiseren en klanten zelf een prijs
              laten berekenen.
            </p>
          </Reveal>

          <div className="mt-12 flex flex-col gap-4">
            {KENNISBANK_ARTIKELEN.map((artikel, i) => (
              <Reveal key={artikel.slug} delay={i * 80}>
                <Link
                  href={`/kennisbank/${artikel.slug}`}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h2 className="font-semibold text-foreground">{artikel.titel}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {artikel.samenvatting}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                    Lezen
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
