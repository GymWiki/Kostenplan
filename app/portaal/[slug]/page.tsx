import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getLegacyToolForCompanySlug } from "@/app/lib/dal";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { Calculator } from "./calculator";

// Cached per request: generateMetadata() and the page component below are
// called separately by Next.js and would otherwise each hit Postgres for
// this same tenant — on one of the highest-traffic routes in the app (every
// visitor of every legacy pre-Levering-A link). cache() makes them share one
// fetch.
const getLegacyPortalData = cache(getLegacyToolForCompanySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getLegacyPortalData(slug);
  if (!tool) return { title: "Kostencalculator" };

  const title = `Kostencalculator ${tool.company.naam}`;
  const description = `Bereken direct een schatting van de kosten voor jouw project bij ${tool.company.naam}.`;

  return {
    title,
    description,
    alternates: { canonical: `/portaal/${slug}` },
    openGraph: {
      title,
      description,
      url: `/portaal/${slug}`,
      siteName: "Kostenplan",
      locale: "nl_NL",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// Legacy-route van vóór Levering A (multi-tool) — bestaande klanten kunnen
// deze URL al op hun website of in een iframe hebben staan. Rendert bewust
// rechtstreeks (geen redirect naar /t/[bedrijfsslug]/[toolslug]) om
// bestaande embeds nooit te breken: zie getLegacyToolForCompanySlug in
// app/lib/dal.ts. Toont de eerste (laagste `order`) gepubliceerde tool van
// het bedrijf; heeft een bedrijf meerdere gepubliceerde tools, dan is dit
// een bewuste vereenvoudiging — nieuwe tools horen bij hun eigen
// /t/-adres, niet bij deze historische URL.
export default async function PortaalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tool = await getLegacyPortalData(slug);
  if (!tool || !tool.costSettings) notFound();

  const effectieveCostSettings = resolveCostSettings(tool.costSettings, tool.company);

  return (
    <Calculator
      toolId={tool.id}
      bedrijfsnaam={tool.company.naam}
      email={tool.company.creator.email}
      subscriptionTier={effectiveTier(tool.company)}
      branding={tool.branding}
      costSettings={effectieveCostSettings}
      products={tool.products}
    />
  );
}
