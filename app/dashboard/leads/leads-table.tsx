"use client";

import { formatCurrency } from "@/app/lib/format";
import { Card } from "@/app/components/ui/card";
import { StatusSelect } from "./status-select";
import type { LeadWithNotes } from "./leads-view";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export function LeadsTable({
  leads,
  onSelectLead,
}: {
  leads: LeadWithNotes[];
  onSelectLead: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Naam</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
                  <StatusSelect leadId={lead.id} status={lead.status} className="h-9 w-auto min-w-40" />
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
