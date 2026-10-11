import type { Metadata } from "next";
import { MarketingShell } from "@/app/components/landing/marketing-shell";
import { normaliseerSite } from "@/app/lib/site";
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

// Publiek, zonder account en zonder database: het voorbeeld dat hier gemaakt wordt
// leeft alleen in de browser van de bezoeker.
// /probeer?site=voorbeeld.nl vult de website alvast in (voor outreach-links);
// de site wordt gevalideerd en genormaliseerd voordat hij in het veld komt.
export default async function ProbeerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const site = normaliseerSite(eerste(p.site));
  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Maak gratis je rekentool</h1>
        <p className="mt-3 text-lg text-muted-foreground">Je ziet hem meteen zoals je klant hem ziet. Geen account nodig.</p>
        <div className="mt-8">
          <ProbeerFormulier siteStart={site} />
        </div>
      </main>
    </MarketingShell>
  );
}
