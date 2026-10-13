import { OfferteTips } from "@/app/components/dashboard/offerte-tips";
import { laadOfferteTips } from "@/app/lib/offerte/tips";
import type { Metadata } from "next";
import { Suspense } from "react";
import { requireActiveCompany, getLeadsPageData } from "@/app/lib/dal";
import { effectiveTier } from "@/app/lib/subscription";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteRegel } from "@/app/lib/offertes";
import { planReserveIngest } from "@/app/lib/reserve-ingest";
import { planLeadMailWachtrij } from "@/app/lib/mail/plan-lead-mail";
import { resolveWerkgebied } from "@/app/lib/werkgebied/schema";
import type { LeadStart } from "./lead-detail-drawer";
import { bouwVoortgang } from "@/app/lib/lead-voortgang";
import { LeadsView, type LeadWithNotes } from "./leads-view";

export const metadata: Metadata = { title: "Leads" };

// LeadsView leest weergave/toolfilter uit de URL via useSearchParams() (Web
// Interface Guidelines: "URL reflects state") — die hook vereist een eigen
// Suspense-grens los van de route-brede loading.tsx, anders faalt de build.
function LeadsViewFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl border border-border bg-secondary/50" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl border border-border bg-secondary/50" />
    </div>
  );
}

export default async function LeadsPage() {
  const { company } = await requireActiveCompany();
  // Wie de leads bekijkt, ziet ook meteen aanvragen uit de reserve en verstuurt openstaande mails.
  planReserveIngest();
  planLeadMailWachtrij();
  const isGratis = effectiveTier(company) === "GRATIS";

  // Leads ontvangen is een Plus/Pro-feature — op Gratis tonen we alleen de
  // upsell in LeadsView, dus de data zelf hoeft niet opgehaald te worden.
  if (isGratis) {
    return (
      <Suspense fallback={<LeadsViewFallback />}>
        <LeadsView leads={[]} isGratis />
      </Suspense>
    );
  }

  const { rawLeads, tools } = await getLeadsPageData(company.id);

  // Startadres en straal per rekentool (van het bedrijf, of de eigen instelling van de rekentool) voor de kaart.
  const startPerTool: Record<string, LeadStart> = {};
  for (const tool of tools) {
    const w = resolveWerkgebied(company.werkgebied, tool.werkgebied).werkgebied;
    if (w.aan && w.start) {
      startPerTool[tool.id] = { lat: w.start.lat, lon: w.start.lon, straalKm: w.methode === "STRAAL" ? w.straalKm : null, label: "Je vestigingsadres" };
    }
  }

  const leads: LeadWithNotes[] = rawLeads.map(({ offertesV2, gebeurtenissen, facturen, ...lead }) => {
    const v2 = offertesV2[0];
    return {
      ...lead,
      voortgang: bouwVoortgang({ ...lead, gebeurtenissen, offertesV2, facturen }),
      snapshot: lead.snapshot as unknown as LeadSnapshot,
      // Nieuwe offertes (v2) krijgen dezelfde vorm als de oude, zodat bord, lijst en paneel ze gelijk tonen.
      offerte: v2
        ? {
            id: v2.id,
            leadId: lead.id,
            status: v2.status === "BEKEKEN" || v2.status === "VERSTUURD" ? "VERSTUURD" : v2.status === "CONCEPT" ? "CONCEPT" : v2.status,
            regels: [],
            introTekst: null,
            voorwaardenTekst: null,
            geldigTot: v2.geldigTot ?? new Date(8.64e15),
            deelToken: null,
            pdfUrl: null,
            verstuurdOp: null,
            ingetrokkenOp: null,
            gereageerdOp: null,
            klantReactie: null,
            reactieGezien: v2.reactieGezien,
            createdAt: lead.createdAt,
            updatedAt: lead.createdAt,
            v2Status: v2.status,
          }
        : lead.offerte
          ? { ...lead.offerte, regels: lead.offerte.regels as unknown as OfferteRegel[] }
          : null,
    };
  });

  // KPI's (pipelinewaarde, conversieratio, …) worden client-side in
  // LeadsView afgeleid van `leads` — zo bewegen ze meteen mee met een
  // optimistische statuswijziging in plaats van pas na de server-round-trip.
  const offerteTips = await laadOfferteTips(company.id).catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <OfferteTips tips={offerteTips} />
      <Suspense fallback={<LeadsViewFallback />}>
        <LeadsView leads={leads} isGratis={false} tools={tools.map(({ id, naam }) => ({ id, naam }))} startPerTool={startPerTool} />
      </Suspense>
    </div>
  );
}
