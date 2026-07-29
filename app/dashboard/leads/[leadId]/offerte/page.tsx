import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getSiteUrl } from "@/app/lib/url";
import { OfferteEditor } from "./offerte-editor";
import type { OfferteRegel } from "@/app/lib/offertes";

export const metadata: Metadata = { title: "Offerte" };

export default async function OffertePage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const { company } = await requireActiveCompany();

  const [lead, branding, costSettings] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, companyId: company.id },
      include: { offerte: true },
    }),
    prisma.branding.findUnique({ where: { companyId: company.id } }),
    prisma.costSettings.findUnique({ where: { companyId: company.id }, select: { btwPercentage: true } }),
  ]);

  // Er bestaat geen editor zonder offerte — die wordt aangemaakt door
  // omzettenNaarOfferteAction (zie de aanvragenpagina), niet hier.
  if (!lead || !lead.offerte) notFound();

  return (
    <OfferteEditor
      offerte={{
        ...lead.offerte,
        regels: lead.offerte.regels as unknown as OfferteRegel[],
      }}
      klantNaam={lead.naam}
      bedrijfsnaam={company.naam}
      branding={branding}
      btwPercentage={costSettings?.btwPercentage ?? 21}
      siteUrl={getSiteUrl()}
    />
  );
}
