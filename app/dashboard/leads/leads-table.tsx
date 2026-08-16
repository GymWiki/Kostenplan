"use client";

import { formatCurrency } from "@/app/lib/format";
import { Card } from "@/app/components/ui/card";
import { StatusSelect } from "./status-select";
import { OfferteStatusBadge } from "./offerte-status-badge";
import type { LeadWithNotes } from "./leads-view";
import type { LeadStatus } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export function LeadsTable({
  leads,
  onSelectLead,
  onUpdateStatus,
}: {
  leads: LeadWithNotes[];
  onSelectLead: (id: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Naam</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Offerte</th>
              <th className="px-4 py-3 font-medium">Pipeline waarde</th>
              <th className="px-4 py-3 font-medium">Aangemaakt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="cursor-pointer transition-colors hover:bg-secondary/50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{lead.naam}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    leadId={lead.id}
                    status={lead.status}
                    className="h-9 w-auto min-w-40"
                    onStatusChange={onUpdateStatus}
                  />
                </td>
                <td className="px-4 py-3">
                  {lead.offerte ? (
                    <div className="flex items-center gap-1.5">
                      <OfferteStatusBadge offerte={lead.offerte} />
                      {!lead.offerte.reactieGezien && (
                        <span
                          className="animate-soft-pulse h-2 w-2 rounded-full bg-accent"
                          aria-label="Klant heeft gereageerd"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {formatCurrency(lead.totaalIndicatie)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {dateFormatter.format(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
