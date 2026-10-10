import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { normaliseerSite } from "@/app/lib/gast";
import { ProbeerFormulier } from "./probeer-formulier";

const TITLE = "Gratis rekentool voor hoveniers maken, zonder account";
const DESCRIPTION =
  "Maak in twee minuten een rekentool voor je hoveniersbedrijf met je eigen logo en kleuren. Probeer hem uit als klant. Geen account of e-mailadres nodig.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/probeer" },
  openGraph: { title: `${TITLE} · Kostenplan`, description: DESCRIPTION, url: "/probeer", siteName: "Kostenplan", locale: "nl_NL", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: `${TITLE} · Kostenplan`, description: DESCRIPTION, images: ["/opengraph-image"] },
};

const eerste = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Publiek, geen sessie: de gast-sessie start pas bij "Maak mijn rekentool".
// /probeer?site=voorbeeld.nl vult de website alvast in (voor outreach-links);
// de site wordt gevalideerd en genormaliseerd voordat hij in het veld komt.
export default async function ProbeerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const site = normaliseerSite(eerste(p.site));
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Maak gratis je rekentool</h1>
        <p className="mt-3 text-lg text-muted-foreground">Je ziet hem meteen zoals je klant hem ziet. Geen account nodig.</p>
        <div className="mt-8">
          <ProbeerFormulier
            siteStart={site ? site.replace(/^https:\/\//, "") : ""}
            metSiteParam={Boolean(site)}
            utm={{ utm_source: eerste(p.utm_source), utm_medium: eerste(p.utm_medium), utm_campaign: eerste(p.utm_campaign) }}
            verlopen={eerste(p.verlopen) === "1"}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
