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
import { herinneringNodig, weergaveStatusV2 } from "@/app/lib/offerte/status";
import { geldendeInhoud } from "@/app/lib/offerte/geldend";
import { OfferteEditorV2 } from "@/app/components/offerte/offerte-editor-v2";
import { OfferteStarter } from "@/app/components/offerte/offerte-starter";

// Het klaarzetten om te delen maakt de PDF met headless Chromium; geef de server daar de tijd voor.
export const maxDuration = 60;

export const metadata: Metadata = { title: "Offerte" };

export default async function OffertePage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ herinnering?: string }>;
}) {
  const { leadId } = await params;
  const { herinnering: herinneringParam } = await searchParams;
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
    const [gebeurtenissen, akkoord, standaardRegels, gegevens] = await Promise.all([
      prisma.offerteGebeurtenis.findMany({ where: { offerteId: v2.id }, orderBy: { createdAt: "desc" }, take: 15 }),
      prisma.offerteAkkoord.findFirst({ where: { offerteId: v2.id }, select: { id: true, gekozenRegelIds: true } }),
      prisma.offerteStandaardRegel.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
      laadOfferteGegevens(company),
    ]);
    return (
      <OfferteEditorV2
        offerteId={v2.id}
        revisie={huidig.revisie}
        status={weergaveStatusV2({ status: v2.status, geldigTot: v2.geldigTot })}
        vergrendeld={huidig.vergrendeld}
        deelklaar={!huidig.vergrendeld && Boolean(huidig.pdfHash)}
        startHerinnering={herinneringParam === "1"}
        herinnering={herinneringNodig({ status: v2.status, geldigTot: v2.geldigTot, verstuurdOp: v2.verstuurdOp })}
        activiteit={gebeurtenissen.map((g) => ({ id: g.id, soort: g.soort, tekst: g.tekst, op: g.createdAt.toISOString() }))}
        heeftGetekend={Boolean(akkoord)}
        gekozenOptioneel={geldendeInhoud({ inhoud: huidig.inhoud, akkoorden: akkoord ? [akkoord] : [] }).gekozenOptioneel}
        // Een concept volgt altijd de actuele algemene voorwaarden uit Profiel (anders blijft "geen voorwaarden bijgevoegd" staan na een upload).
        begin={
          huidig.vergrendeld
            ? (huidig.inhoud as unknown as OfferteInhoud)
            : { ...(huidig.inhoud as unknown as OfferteInhoud), bijlagen: gegevens.voorwaardenPdfUrl ? [{ naam: gegevens.voorwaardenPdfNaam || "Algemene voorwaarden.pdf", url: gegevens.voorwaardenPdfUrl }] : [] }
        }
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
