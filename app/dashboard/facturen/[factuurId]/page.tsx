import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import type { RegelSoort } from "@/app/lib/offerte/btw-config";
import type { FactuurInhoud } from "@/app/lib/factuur/model";
import { regelBedragExcl } from "@/app/lib/offerte/bereken";
import { dagenTeLaat, openstaandCenten, volgendeHerinnering } from "@/app/lib/factuur/betaling";
import type { BeheerData } from "@/app/components/factuur/factuur-beheer";
import { OfferteEditorV2 } from "@/app/components/offerte/offerte-editor-v2";

// De factuur-editor gebruikt dezelfde editor als de offerte (document, panelen, autosave), met factuurspecifieke velden.
export const maxDuration = 60;
export const metadata: Metadata = { title: "Factuur" };

export default async function FactuurPagina({ params }: { params: Promise<{ factuurId: string }> }) {
  const { factuurId } = await params;
  const { company } = await requireActiveCompany();
  const f = await prisma.factuur.findFirst({
    where: { id: factuurId, companyId: company.id },
    omit: { pdfData: true },
    include: { betalingen: { orderBy: { datum: "asc" } }, gebeurtenissen: { orderBy: { createdAt: "desc" } }, creditnotas: { select: { id: true, nummer: true, status: true, totaalInclCenten: true } }, creditVoor: { select: { id: true, nummer: true } } },
  });
  if (!f) notFound();
  const [standaardRegels, gegevens] = await Promise.all([prisma.offerteStandaardRegel.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }), laadOfferteGegevens(company)]);
  const inhoud = f.inhoud as unknown as FactuurInhoud;
  let beheer: BeheerData | undefined;
  if (f.status !== "CONCEPT") {
    const betaald = f.betalingen.reduce((t, b) => t + b.bedragCenten, 0);
    const gecrediteerd = f.creditnotas.filter((c) => c.status !== "CONCEPT").reduce((t, c) => t - c.totaalInclCenten, 0);
    const open = openstaandCenten({ totaalInclCenten: f.totaalInclCenten, betaaldCenten: betaald, gecrediteerdCenten: gecrediteerd });
    const aantal = (soort: string) => f.gebeurtenissen.filter((g) => g.soort === soort).length;
    const isCredit = f.type === "CREDITNOTA";
    beheer = {
      id: f.id,
      isCreditnota: isCredit,
      status: f.status,
      totaalInclCenten: f.totaalInclCenten,
      betaaldCenten: betaald,
      gecrediteerdCenten: gecrediteerd,
      openstaandCenten: isCredit ? 0 : open,
      vervaldatum: f.vervaldatum ? f.vervaldatum.toISOString().slice(0, 10) : null,
      dagenTeLaat: isCredit ? null : dagenTeLaat({ vervaldatum: f.vervaldatum, status: f.status, openstaandCenten: open }),
      volgende: isCredit ? null : volgendeHerinnering({ herinneringen: aantal("HERINNERING"), aanmaningen: aantal("AANMANING"), laatste: aantal("LAATSTE_HERINNERING") }, inhoud.klant.type),
      betalingen: f.betalingen.map((b) => ({ id: b.id, datum: b.datum.toISOString().slice(0, 10), bedragCenten: b.bedragCenten, methode: b.methode, notitie: b.notitie })),
      gebeurtenissen: f.gebeurtenissen.map((g) => ({ id: g.id, soort: g.soort, tekst: g.tekst, bedragCenten: g.bedragCenten, tijdstip: g.createdAt.toISOString() })),
      regels: isCredit ? [] : inhoud.secties.flatMap((s) => s.regels).filter((r) => r.type !== "tekst").map((r) => ({ id: r.id, omschrijving: r.omschrijving, bedragExclCenten: regelBedragExcl(r) })),
      creditnotas: f.creditnotas.map((c) => ({ id: c.id, nummer: c.nummer, status: c.status })),
      creditVoor: f.creditVoor,
    };
  }
  return (
    <OfferteEditorV2
      offerteId={f.id}
      revisie={f.revisie}
      status="CONCEPT"
      vergrendeld={false}
      begin={inhoud}
      versies={[]}
      standaardRegels={standaardRegels.map((r) => ({ id: r.id, omschrijving: r.omschrijving, eenheid: r.eenheid, prijsCenten: r.prijsCenten, btw: r.btw, soort: r.soort }))}
      btwStandaard={gegevens.btwStandaard as Partial<Record<RegelSoort, number>> | null}
      factuur={{ id: f.id, status: f.status, terug: f.leadId ? `/dashboard/leads?lead=${f.leadId}` : "/dashboard/leads", beheer }}
    />
  );
}
