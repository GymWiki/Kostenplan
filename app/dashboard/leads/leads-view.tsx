"use client";

import { useState } from "react";
import { LayoutGrid, List, TrendingUp, Users, Trophy, Target, Mail } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { KanbanBoard } from "./kanban-board";
import { LeadsTable } from "./leads-table";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import type { Lead, LeadNote } from "@/app/generated/prisma/client";
import type { LeadSnapshot } from "@/app/lib/leads";

export type LeadWithNotes = Omit<Lead, "snapshot"> & {
  snapshot: LeadSnapshot;
  notities: LeadNote[];
};

type View = "kanban" | "lijst";

export function LeadsView({
  leads,
  pipelineWaarde,
  actieveCount,
  gewonnenCount,
  conversieRatio,
  isGratis,
}: {
  leads: LeadWithNotes[];
  pipelineWaarde: number;
  actieveCount: number;
  gewonnenCount: number;
  conversieRatio: number | null;
  isGratis: boolean;
}) {
  const [view, setView] = useState<View>("kanban");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;

  if (isGratis) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Offerte-aanvragen vanuit je klantenportaal, op één plek.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </span>
            <p className="text-lg font-semibold text-foreground">
              Offerte-aanvragen ontvangen?
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Vanaf Plus verschijnt elke offerte-aanvraag die een klant via jouw klantenportaal
              indient direct hier, inclusief contactgegevens en prijsindicatie. Upgrade naar Plus
              of Pro om leads binnen te laten komen.
            </p>
            <LinkButton href="/dashboard/abonnement" className="mt-2">
              Upgrade naar Plus of Pro
            </LinkButton>
          </CardContent>
        </Card>
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
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("kanban")}
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
            onClick={() => setView("lijst")}
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
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Pipeline waarde"
          value={formatCurrency(pipelineWaarde)}
          hint="Actieve aanvragen"
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

      {leads.length === 0 ? (
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
        <KanbanBoard leads={leads} onSelectLead={setSelectedLeadId} />
      ) : (
        <LeadsTable leads={leads} onSelectLead={setSelectedLeadId} />
      )}

      <LeadDetailDrawer lead={selectedLead} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
