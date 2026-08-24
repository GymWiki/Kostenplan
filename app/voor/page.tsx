import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/app/components/ui/reveal";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { DOELGROEPEN } from "@/app/lib/doelgroepen";

const TITLE = "Voor vakmensen";
const DESCRIPTION =
  "Kostenplan werkt voor elk vakgebied waarin klanten vooraf een prijsindicatie willen zien — bekijk hoe dat er per vakgebied uitziet.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/voor" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/voor",
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

export default function VoorIndexPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Voor vakmensen", href: "/voor" }]} />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Voor vakmensen
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{DESCRIPTION}</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOELGROEPEN.map((d, i) => (
              <Reveal key={d.slug} delay={i * 60}>
                <Link
                  href={`/voor/${d.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    <h2 className="font-semibold text-foreground">Voor {d.naamMeervoud}</h2>
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
      </main>

      <SiteFooter />
    </div>
  );
}
