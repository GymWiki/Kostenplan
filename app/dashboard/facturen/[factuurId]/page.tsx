import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import type { RegelSoort } from "@/app/lib/offerte/btw-config";
import type { FactuurInhoud } from "@/app/lib/factuur/model";
import { OfferteEditorV2 } from "@/app/components/offerte/offerte-editor-v2";

// De factuur-editor gebruikt dezelfde editor als de offerte (document, panelen, autosave), met factuurspecifieke velden.
export const maxDuration = 60;
export const metadata: Metadata = { title: "Factuur" };

export default async function FactuurPagina({ params }: { params: Promise<{ factuurId: string }> }) {
  const { factuurId } = await params;
  const { company } = await requireActiveCompany();
  const f = await prisma.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, omit: { pdfData: true } });
  if (!f) notFound();
  const [standaardRegels, gegevens] = await Promise.all([prisma.offerteStandaardRegel.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }), laadOfferteGegevens(company)]);
  return (
    <OfferteEditorV2
      offerteId={f.id}
      status="CONCEPT"
      vergrendeld={false}
      begin={f.inhoud as unknown as FactuurInhoud}
      versies={[]}
      standaardRegels={standaardRegels.map((r) => ({ id: r.id, omschrijving: r.omschrijving, eenheid: r.eenheid, prijsCenten: r.prijsCenten, btw: r.btw, soort: r.soort }))}
      btwStandaard={gegevens.btwStandaard as Partial<Record<RegelSoort, number>> | null}
      factuur={{ id: f.id, status: f.status, terug: f.leadId ? `/dashboard/leads?lead=${f.leadId}` : "/dashboard/leads" }}
    />
  );
}
