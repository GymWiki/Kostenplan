"use client";

import { useTransition } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { Badge } from "@/app/components/ui/badge";
import { updateLeadStatusAction } from "@/app/lib/actions/leads";
import { LEAD_STATUSSEN, LEAD_STATUS_LABELS } from "@/app/lib/leads";
import type { LeadWithNotes } from "./leads-view";
import type { LeadStatus } from "@/app/generated/prisma/client";

const STATUS_ACCENT: Record<LeadStatus, string> = {
  NIEUW: "border-t-blue-500",
  IN_BEHANDELING: "border-t-amber-500",
  OFFERTE_VERSTUURD: "border-t-violet-500",
  GEWONNEN: "border-t-emerald-500",
  VERLOREN: "border-t-rose-400",
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });

export function KanbanBoard({
  leads,
  onSelectLead,
}: {
  leads: LeadWithNotes[];
  onSelectLead: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  // Kleine bewegingsdrempel zodat een gewone klik (kaart openen) niet als
  // begin van een drag wordt gezien.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.status === newStatus) return;

    const formData = new FormData();
    formData.set("leadId", lead.id);
    formData.set("status", newStatus);
    startTransition(() => updateLeadStatusAction(formData));
  }

  return (
    // Vaste id: dnd-kit genereert anders intern een aria-describedby-id die
    // op de server en bij client-hydratie uiteen kan lopen (een hydration-
    // mismatch warning tot gevolg), zie dnd-kit's SSR-advies.
    <DndContext id="leads-kanban" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {LEAD_STATUSSEN.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter((lead) => lead.status === status)}
            onSelectLead={onSelectLead}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  leads,
  onSelectLead,
}: {
  status: LeadStatus;
  leads: LeadWithNotes[];
  onSelectLead: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const totaal = leads.reduce((sum, lead) => sum + lead.totaalIndicatie, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-t-4 border-border bg-secondary/30 p-3 transition-colors",
        STATUS_ACCENT[status],
        isOver && "bg-secondary/60 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{LEAD_STATUS_LABELS[status]}</h3>
        <Badge variant="muted">{leads.length}</Badge>
      </div>
      {leads.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">{formatCurrency(totaal)}</p>
      )}
      <div className="flex min-h-24 flex-col gap-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead.id)} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: LeadWithNotes; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg"
      )}
    >
      <p className="truncate font-medium text-foreground">{lead.naam}</p>
      <p className="mt-1 text-sm font-semibold text-primary">
        {formatCurrency(lead.totaalIndicatie)}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{dateFormatter.format(lead.createdAt)}</span>
        {lead.notities.length > 0 && <span>{lead.notities.length} notitie(s)</span>}
      </div>
    </div>
  );
}
