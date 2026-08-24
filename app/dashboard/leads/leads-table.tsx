"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { formatCurrency } from "@/app/lib/format";
import { Card } from "@/app/components/ui/card";
import { cn } from "@/app/lib/cn";
import { StatusSelect } from "./status-select";
import { OfferteStatusBadge } from "./offerte-status-badge";
import type { LeadWithNotes } from "./leads-view";
import type { LeadStatus } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

type Kolom = "naam" | "waarde" | "aangemaakt";
type Sortering = { kolom: Kolom; richting: "asc" | "desc" };

// Audit-bevindingen T-01/T-02/T-03: geen zoeken/sorteren, geen sticky
// header, en op mobiel alleen horizontaal scrollen. Data blijft — net als
// voorheen — volledig client-side geleverd door LeadsView (nodig voor de
// optimistische statuswijziging en het Kanban-bord); zoeken/sorteren
// filteren/herordenen die al-geladen lijst, geen extra server-roundtrip.
export function LeadsTable({
  leads,
  showTool = false,
  onSelectLead,
  onUpdateStatus,
}: {
  leads: LeadWithNotes[];
  showTool?: boolean;
  onSelectLead: (id: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}) {
  const [zoek, setZoek] = useState("");
  const [sortering, setSortering] = useState<Sortering>({ kolom: "aangemaakt", richting: "desc" });

  function wisselSortering(kolom: Kolom) {
    setSortering((prev) => (prev.kolom === kolom ? { kolom, richting: prev.richting === "asc" ? "desc" : "asc" } : { kolom, richting: "desc" }));
  }

  const zichtbaar = useMemo(() => {
    const query = zoek.trim().toLowerCase();
    const gefilterd = query
      ? leads.filter((lead) => lead.naam.toLowerCase().includes(query) || lead.email.toLowerCase().includes(query))
      : leads;
    const factor = sortering.richting === "asc" ? 1 : -1;
    return [...gefilterd].sort((a, b) => {
      if (sortering.kolom === "naam") return factor * a.naam.localeCompare(b.naam);
      if (sortering.kolom === "waarde") return factor * (a.totaalIndicatie - b.totaalIndicatie);
      return factor * (a.createdAt.getTime() - b.createdAt.getTime());
    });
  }, [leads, zoek, sortering]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op naam of e-mail…"
          aria-label="Zoek in aanvragen"
          className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Desktop/tablet: tabel met sticky header. Onder md: kaartweergave i.p.v. horizontaal scrollen. */}
      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border text-left text-muted-foreground">
                <SorteerbareKolom label="Naam" kolom="naam" sortering={sortering} onClick={wisselSortering} />
                {showTool && <th className="px-4 py-3 font-medium">Rekentool</th>}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Offerte</th>
                <SorteerbareKolom label="Pipeline waarde" kolom="waarde" sortering={sortering} onClick={wisselSortering} />
                <SorteerbareKolom label="Aangemaakt" kolom="aangemaakt" sortering={sortering} onClick={wisselSortering} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zichtbaar.map((lead) => (
                <tr key={lead.id} onClick={() => onSelectLead(lead.id)} className="cursor-pointer transition-colors hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{lead.naam}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  {showTool && <td className="px-4 py-3 text-muted-foreground">{lead.toolNaamSnapshot}</td>}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect leadId={lead.id} status={lead.status} className="h-9 w-auto min-w-40" onStatusChange={onUpdateStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.offerte ? (
                      <div className="flex items-center gap-1.5">
                        <OfferteStatusBadge offerte={lead.offerte} />
                        {!lead.offerte.reactieGezien && <span className="animate-soft-pulse h-2 w-2 rounded-full bg-accent" aria-label="Klant heeft gereageerd" />}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(lead.totaalIndicatie)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dateFormatter.format(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col gap-2 md:hidden">
        {zichtbaar.map((lead) => (
          <Card
            key={lead.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectLead(lead.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectLead(lead.id);
              }
            }}
            className="cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{lead.naam}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                  {showTool && <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.toolNaamSnapshot}</p>}
                </div>
                <p className="shrink-0 font-medium text-foreground">{formatCurrency(lead.totaalIndicatie)}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusSelect leadId={lead.id} status={lead.status} className="h-9 w-auto" onStatusChange={onUpdateStatus} />
                </div>
                {lead.offerte ? (
                  <div className="flex items-center gap-1.5">
                    <OfferteStatusBadge offerte={lead.offerte} />
                    {!lead.offerte.reactieGezien && <span className="animate-soft-pulse h-2 w-2 rounded-full bg-accent" aria-label="Klant heeft gereageerd" />}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{dateFormatter.format(lead.createdAt)}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {zichtbaar.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Geen aanvragen gevonden voor &ldquo;{zoek}&rdquo;.
        </p>
      )}
    </div>
  );
}

function SorteerbareKolom({
  label,
  kolom,
  sortering,
  onClick,
}: {
  label: string;
  kolom: Kolom;
  sortering: Sortering;
  onClick: (kolom: Kolom) => void;
}) {
  const actief = sortering.kolom === kolom;
  const Icon = actief ? (sortering.richting === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(kolom)}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-foreground cursor-pointer",
          actief && "text-foreground"
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", !actief && "opacity-40")} />
      </button>
    </th>
  );
}
