import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getSiteUrl } from "@/app/lib/url";
import { OfferteEditor } from "./offerte-editor";
import type { OfferteRegel } from "@/app/lib/offertes";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
import type { OfferteInhoud } from "@/app/lib/offerte/model";
import type { RegelSoort } from "@/app/lib/offerte/btw-config";
import { OfferteEditorV2 } from "@/app/components/offerte/offerte-editor-v2";
import { OfferteStarter } from "@/app/components/offerte/offerte-starter";

// Het versturen maakt de PDF met headless Chromium; geef de server daar de tijd voor.
export const maxDuration = 60;

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
    include: { offerte: true, offertesV2: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!lead) notFound();

  // Nieuwe offertes (v2): versies, nummering en btw per regel.
  const v2 = lead.offertesV2[0];
  if (v2) {
    if (!v2.reactieGezien) await prisma.offerteV2.update({ where: { id: v2.id }, data: { reactieGezien: true } });
    const versies = await prisma.offerteVersie.findMany({ where: { offerteId: v2.id }, orderBy: { versie: "asc" }, omit: { pdfData: true } });
    const huidig = versies.find((v) => v.versie === v2.huidigeVersie) ?? versies[versies.length - 1];
    const [standaardRegels, gegevens] = await Promise.all([
      prisma.offerteStandaardRegel.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
      laadOfferteGegevens(company),
    ]);
    return (
      <OfferteEditorV2
        offerteId={v2.id}
        status={v2.status}
        vergrendeld={huidig.vergrendeld}
        begin={huidig.inhoud as unknown as OfferteInhoud}
        versies={versies.map((v) => ({ versie: v.versie, vergrendeld: v.vergrendeld, verstuurdOp: v.verstuurdOp?.toISOString() ?? null }))}
        standaardRegels={standaardRegels.map((r) => ({ id: r.id, omschrijving: r.omschrijving, eenheid: r.eenheid, prijsCenten: r.prijsCenten, btw: r.btw, soort: r.soort }))}
        btwStandaard={gegevens.btwStandaard as Partial<Record<RegelSoort, number>> | null}
      />
    );
  }

  // Bestaande (oude) offertes blijven bekijkbaar en bewerkbaar zoals ze waren.
  if (!lead.offerte) {
    const gegevens = await laadOfferteGegevens(company);
    const brandingStart = await prisma.branding.findUnique({ where: { toolId: lead.toolId }, select: { primaireKleur: true } });
    return <OfferteStarter leadId={lead.id} gegevens={gegevens} ontbreekt={ontbrekendeVerplichteGegevens(gegevens).length} kleur={brandingStart?.primaireKleur ?? "#15803d"} />;
  }

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
