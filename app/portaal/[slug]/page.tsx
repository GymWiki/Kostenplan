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
  return prisma.user.findUnique({
    where: { slug },
    // select (not include) at the top level so this public, unauthenticated,
    // highest-traffic query only pulls the scalar User columns actually
    // used below — not Mollie IDs, onboarding flags, timestamps, etc.
    select: {
      bedrijfsnaam: true,
      email: true,
      subscriptionTier: true,
      overrideTier: true,
      costSettings: true,
      branding: true,
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
  const user = await getPortalData(slug);
  if (!user) return { title: "Kostencalculator" };
  return {
    title: `Kostencalculator ${user.bedrijfsnaam}`,
    description: `Bereken direct een schatting van de kosten voor jouw project bij ${user.bedrijfsnaam}.`,
  };
}

export default async function PortaalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getPortalData(slug);

  if (!user || !user.costSettings) notFound();

  return (
    <Calculator
      slug={slug}
      bedrijfsnaam={user.bedrijfsnaam}
      email={user.email}
      subscriptionTier={effectiveTier(user)}
      branding={user.branding}
      costSettings={user.costSettings}
      services={user.services}
      products={user.products}
    />
  );
}
