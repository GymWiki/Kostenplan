import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { Calculator } from "./calculator";

// Cached per request: generateMetadata() and the page component below are
// called separately by Next.js and would otherwise each hit Postgres for
// this same tenant — on the single highest-traffic route in the app (every
// visitor of every tenant's public calculator). cache() makes them share
// one fetch.
const getPortalData = cache(async (slug: string) => {
  return prisma.company.findUnique({
    where: { slug },
    // select (not include) at the top level so this public, unauthenticated,
    // highest-traffic query only pulls the scalar Company columns actually
    // used below — not Mollie IDs, onboarding flags, timestamps, etc.
    select: {
      naam: true,
      subscriptionTier: true,
      overrideTier: true,
      costSettings: true,
      branding: true,
      // De contact-e-mail die (indien Branding.toonEmail aanstaat) publiek
      // op het portaal wordt getoond — dat was vóór multi-company altijd
      // het login-e-mailadres van de tenant zelf, dus voor gemigreerde
      // bedrijven levert de aanmaker-relatie exact hetzelfde adres op.
      creator: { select: { email: true } },
      services: {
        where: { actief: true },
        orderBy: { order: "asc" },
      },
      products: {
        where: { actief: true },
        orderBy: { order: "asc" },
        include: {
          materiaalCategorieen: {
            orderBy: { order: "asc" },
            include: {
              materialen: {
                where: { actief: true },
                orderBy: { order: "asc" },
              },
            },
          },
          extraOpties: {
            where: { actief: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getPortalData(slug);
  if (!company) return { title: "Kostencalculator" };
  return {
    title: `Kostencalculator ${company.naam}`,
    description: `Bereken direct een schatting van de kosten voor jouw project bij ${company.naam}.`,
  };
}

export default async function PortaalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const company = await getPortalData(slug);

  if (!company || !company.costSettings) notFound();

  return (
    <Calculator
      slug={slug}
      bedrijfsnaam={company.naam}
      email={company.creator.email}
      subscriptionTier={effectiveTier(company)}
      branding={company.branding}
      costSettings={company.costSettings}
      services={company.services}
      products={company.products}
    />
  );
}
