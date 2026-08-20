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

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: company.id },
    include: { offerte: true },
  });

  // Er bestaat geen editor zonder offerte — die wordt aangemaakt door
  // omzettenNaarOfferteAction (zie de aanvragenpagina), niet hier.
  if (!lead || !lead.offerte) notFound();

  const [branding, costSettings] = await Promise.all([
    prisma.branding.findUnique({ where: { toolId: lead.toolId } }),
    prisma.costSettings.findUnique({
      where: { toolId: lead.toolId },
      select: { gebruiktAccountBtw: true, btwPercentage: true },
    }),
  ]);
  const effectieveBtw = costSettings
    ? costSettings.gebruiktAccountBtw
      ? company.standaardBtwPercentage
      : costSettings.btwPercentage
    : company.standaardBtwPercentage;

  return (
    <OfferteEditor
      offerte={{
        ...lead.offerte,
        regels: lead.offerte.regels as unknown as OfferteRegel[],
      }}
      klantNaam={lead.naam}
      klantEmail={lead.email}
      bedrijfsnaam={company.naam}
      branding={branding}
      btwPercentage={effectieveBtw}
      siteUrl={getSiteUrl()}
    />
  );
}
