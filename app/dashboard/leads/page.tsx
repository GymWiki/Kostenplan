import type { Metadata } from "next";
import { Suspense } from "react";
import { requireActiveCompany, getLeadsPageData } from "@/app/lib/dal";
import { effectiveTier } from "@/app/lib/subscription";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteRegel } from "@/app/lib/offertes";
import { planReserveIngest } from "@/app/lib/reserve-ingest";
import { planLeadMailWachtrij } from "@/app/lib/mail/plan-lead-mail";
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

  const leads: LeadWithNotes[] = rawLeads.map((lead) => ({
    ...lead,
    snapshot: lead.snapshot as unknown as LeadSnapshot,
    offerte: lead.offerte
      ? { ...lead.offerte, regels: lead.offerte.regels as unknown as OfferteRegel[] }
      : null,
  }));

  // KPI's (pipelinewaarde, conversieratio, …) worden client-side in
  // LeadsView afgeleid van `leads` — zo bewegen ze meteen mee met een
  // optimistische statuswijziging in plaats van pas na de server-round-trip.
  return (
    <Suspense fallback={<LeadsViewFallback />}>
      <LeadsView leads={leads} isGratis={false} tools={tools} />
    </Suspense>
  );
}
