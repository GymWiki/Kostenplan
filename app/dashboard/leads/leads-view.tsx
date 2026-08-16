"use client";

import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { LayoutGrid, List, TrendingUp, Users, Trophy, Target } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { HelpTip } from "@/app/components/ui/help-tip";
import { ProFeatureLock } from "@/app/components/dashboard/pro-feature-lock";
import { updateLeadStatusAction } from "@/app/lib/actions/leads";
import { telItMeeVoorPipeline } from "@/app/lib/leads";
import { KanbanBoard } from "./kanban-board";
import { LeadsTable } from "./leads-table";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import type { Lead, LeadNote, LeadStatus, Offerte } from "@/app/generated/prisma/client";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteRegel } from "@/app/lib/offertes";
import type { HelpContentKey } from "@/app/lib/helpContent";

export type LeadWithNotes = Omit<Lead, "snapshot"> & {
  snapshot: LeadSnapshot;
  notities: LeadNote[];
  offerte: (Omit<Offerte, "regels"> & { regels: OfferteRegel[] }) | null;
};

type View = "kanban" | "lijst";

const NARROW_QUERY = "(max-width: 639px)";

// Of het venster smal genoeg is voor de mobiele Lijst-weergave als
// standaard — via useSyncExternalStore i.p.v. een effect+setState (window
// is server-side niet beschikbaar; dit patroon voorkomt een hydration-
// mismatch, zie ook ThemeToggle voor hetzelfde idee met "mounted").
function useIsNarrowViewport() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(NARROW_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}

export function LeadsView({
  leads,
  isGratis,
}: {
  leads: LeadWithNotes[];
  isGratis: boolean;
}) {
  // null = nog geen expliciete keuze door de gebruiker gemaakt — dan geldt
  // de viewport-afhankelijke standaard hieronder. Zodra iemand zelf op
  // Bord/Lijst klikt, wint die keuze voorgoed van de standaard, ook als het
  // venster daarna van grootte verandert.
  const [gekozenView, setGekozenView] = useState<View | null>(null);
  const isNarrow = useIsNarrowViewport();
  // Het bord stapelt op een smal scherm al zijn statuskolommen verticaal —
  // veel minder bruikbaar dan de Lijst-weergave daar.
  const view: View = gekozenView ?? (isNarrow ? "lijst" : "kanban");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Optimistische statuswijziging: een sleep op het Kanban-bord of een keuze
  // in de statusdropdown (tabelweergave/detailpaneel) verandert de UI meteen
  // — de echte server-round-trip (die 1-2 seconden kan duren, zie
  // requireActiveCompany() in app/lib/dal.ts) loopt op de achtergrond mee in
  // dezelfde transition. React vervangt de optimistische waarde automatisch
  // weer door de echte zodra de action (en de revalidatePath die 'm volgt)
  // klaar is — geen handmatige rollback nodig.
  const [optimisticLeads, applyOptimisticStatus] = useOptimistic(
    leads,
    (state, update: { leadId: string; status: LeadStatus }) =>
      state.map((lead) => (lead.id === update.leadId ? { ...lead, status: update.status } : lead))
  );
  const [, startStatusTransition] = useTransition();
  function updateLeadStatus(leadId: string, status: LeadStatus) {
    startStatusTransition(async () => {
      applyOptimisticStatus({ leadId, status });
      const formData = new FormData();
      formData.set("leadId", leadId);
      formData.set("status", status);
      await updateLeadStatusAction(formData);
    });
  }

  const selectedLead = optimisticLeads.find((lead) => lead.id === selectedLeadId) ?? null;

  // Zelfde berekening als voorheen server-side in page.tsx, nu hier zodat de
  // KPI's direct meebewegen met een optimistische statuswijziging in plaats
  // van pas na de server-round-trip bij te trekken.
  const { pipelineWaarde, actieveCount, gewonnenCount, conversieRatio } = useMemo(() => {
    const actief = optimisticLeads.filter((lead) => telItMeeVoorPipeline(lead.status));
    const waarde = actief.reduce((sum, lead) => sum + lead.totaalIndicatie, 0);
    const gewonnen = optimisticLeads.filter((lead) => lead.status === "GEWONNEN").length;
    const verloren = optimisticLeads.filter((lead) => lead.status === "VERLOREN").length;
    const afgerond = gewonnen + verloren;
    return {
      pipelineWaarde: waarde,
      actieveCount: actief.length,
      gewonnenCount: gewonnen,
      conversieRatio: afgerond > 0 ? Math.round((gewonnen / afgerond) * 100) : null,
    };
  }, [optimisticLeads]);

  if (isGratis) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Offerte-aanvragen vanuit je klantenportaal, op één plek.
          </p>
        </div>

        <ProFeatureLock
          size="lg"
          title="Offerte-aanvragen ontvangen?"
          description="Vanaf Plus verschijnt elke offerte-aanvraag die een klant via jouw klantenportaal indient direct hier, inclusief contactgegevens en prijsindicatie. Upgrade naar Plus of Pro om leads binnen te laten komen."
          ctaLabel="Upgrade naar Plus of Pro"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Offerte-aanvragen vanuit je klantenportaal, op één plek.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setGekozenView("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                view === "kanban"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Bord
            </button>
            <button
              type="button"
              onClick={() => setGekozenView("lijst")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                view === "lijst"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
              Lijst
            </button>
          </div>
          <HelpTip contentKey="leads.statusKolommen" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Pipeline waarde"
          value={formatCurrency(pipelineWaarde)}
          hint="Actieve aanvragen"
          help="leads.pipelineWaarde"
        />
        <KpiCard icon={Users} label="Actieve aanvragen" value={String(actieveCount)} />
        <KpiCard icon={Trophy} label="Gewonnen" value={String(gewonnenCount)} />
        <KpiCard
          icon={Target}
          label="Conversieratio"
          value={conversieRatio === null ? "—" : `${conversieRatio}%`}
          hint="Gewonnen t.o.v. afgerond"
        />
      </div>

      {optimisticLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-medium text-foreground">Nog geen aanvragen</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Zodra een bezoeker via je klantenportaal een offerte aanvraagt, verschijnt die hier.
            </p>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <KanbanBoard leads={optimisticLeads} onSelectLead={setSelectedLeadId} onUpdateStatus={updateLeadStatus} />
      ) : (
        <LeadsTable leads={optimisticLeads} onSelectLead={setSelectedLeadId} onUpdateStatus={updateLeadStatus} />
      )}

      <LeadDetailDrawer lead={selectedLead} onClose={() => setSelectedLeadId(null)} onUpdateStatus={updateLeadStatus} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  help,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  help?: HelpContentKey;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
          {help && <HelpTip contentKey={help} />}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
