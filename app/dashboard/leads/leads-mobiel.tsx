"use client";

import { OFFERTE_FILTER_OPTIES } from "@/app/lib/offerte/lead-status";
import { MARKERING_FILTER_OPTIES } from "@/app/lib/werkgebied/lead-markeringen";
import { LocatieLabels } from "./locatie-labels";
import { OfferteStatusBadge } from "./offerte-status-badge";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, MessageCircle, Phone, Check, Users } from "lucide-react";
import { DropdownMenu } from "@/app/components/ui/dropdown-menu";
import { Select } from "@/app/components/ui/input";
import { SegmentedControl } from "@/app/components/mobile/segmented-control";
import { formatCurrency } from "@/app/lib/format";
import { whatsappLink } from "@/app/lib/leads";
import { eersteRegelNaam } from "@/app/lib/lead-weergave";
import { relatieveTijd } from "@/app/components/dashboard/recente-aanvragen";
import { cn } from "@/app/lib/cn";
import { AfhandelKeuzeModal } from "./afhandel-keuze-modal";
import { FASE_LABEL } from "@/app/lib/lead-fase";
import type { LeadWithNotes } from "./leads-view";

export type LeadFilter = "nieuw" | "open" | "alles";

export function filterLeads(leads: LeadWithNotes[], filter: LeadFilter): LeadWithNotes[] {
  if (filter === "nieuw") return leads.filter((l) => l.voortgang.fase === "nieuw");
  // Open = alles wat nog loopt (ook akkoord, ingepland, te factureren en openstaand), niet afgerond of verloren.
  if (filter === "open") return leads.filter((l) => !["betaald", "verloren", "afgewezen", "offerte-verlopen"].includes(l.voortgang.fase));
  return leads;
}

// Omlaag trekken (vanaf de bovenkant van de pagina) ververst de lijst.
function useTrekVernieuwen() {
  const router = useRouter();
  const [trek, setTrek] = useState(0);
  const [bezig, setBezig] = useState(false);
  const start = useRef<number | null>(null);
  const trekRef = useRef(0);
  useEffect(() => {
    function onStart(e: TouchEvent) {
      start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    }
    function onMove(e: TouchEvent) {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      trekRef.current = dy > 0 ? Math.min(dy, 110) : 0;
      setTrek(trekRef.current);
    }
    function onEnd() {
      if (start.current !== null && trekRef.current > 80) {
        setBezig(true);
        router.refresh();
        setTimeout(() => setBezig(false), 900);
      }
      start.current = null;
      trekRef.current = 0;
      setTrek(0);
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);
  return { trek, bezig };
}

export function LeadsMobiel({
  leads,
  filter,
  onFilter,
  tools,
  toolFilter,
  onToolFilter,
  offerteFilter,
  onOfferteFilter,
  markeringFilter,
  onMarkeringFilter,
  toonMarkeringFilter,
  onSelect,
}: {
  leads: LeadWithNotes[];
  filter: LeadFilter;
  onFilter: (f: LeadFilter) => void;
  tools: { id: string; naam: string }[];
  toolFilter: string;
  onToolFilter: (id: string) => void;
  offerteFilter: string;
  onOfferteFilter: (v: string) => void;
  markeringFilter: string;
  onMarkeringFilter: (v: string) => void;
  // Alleen als er leads zijn met een werkgebied- of minimumlabel.
  toonMarkeringFilter: boolean;
  onSelect: (id: string) => void;
}) {
  const { trek, bezig } = useTrekVernieuwen();
  const [afhandelId, setAfhandelId] = useState<string | null>(null);
  const zichtbaar = useMemo(() => filterLeads(leads, filter), [leads, filter]);
  const aantalNieuw = leads.filter((l) => l.voortgang.fase === "nieuw").length;

  return (
    <div className="flex flex-col gap-3 pb-24 md:hidden">
      <div aria-hidden={trek === 0 && !bezig} className="flex h-0 items-end justify-center overflow-visible text-muted-foreground" style={{ transform: `translateY(${bezig ? 8 : trek / 3}px)` }}>
        {(trek > 20 || bezig) && <Loader2 className={cn("h-5 w-5", (bezig || trek > 80) && "animate-spin")} aria-label="Vernieuwen" />}
      </div>
      <SegmentedControl<LeadFilter>
        label="Filter op status"
        waarde={filter}
        onChange={onFilter}
        opties={[
          { waarde: "nieuw", label: aantalNieuw > 0 ? `Nieuw (${aantalNieuw})` : "Nieuw" },
          { waarde: "open", label: "Open" },
          { waarde: "alles", label: "Alles" },
        ]}
      />
      {tools.length > 1 && (
        <Select aria-label="Filter op rekentool" value={toolFilter} onChange={(e) => onToolFilter(e.target.value)}>
          <option value="alle">Alle rekentools</option>
          {tools.map((t) => (
            <option key={t.id} value={t.id}>
              {t.naam}
            </option>
          ))}
        </Select>
      )}

      <Select aria-label="Filter op offertestatus" value={offerteFilter} onChange={(e) => onOfferteFilter(e.target.value)}>
        {OFFERTE_FILTER_OPTIES.map((o) => (
          <option key={o.waarde} value={o.waarde}>
            {o.label}
          </option>
        ))}
      </Select>
      {toonMarkeringFilter && (
        <Select aria-label="Filter op werkgebied en minimum" value={markeringFilter} onChange={(e) => onMarkeringFilter(e.target.value)}>
          {MARKERING_FILTER_OPTIES.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </Select>
      )}

      {zichtbaar.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">{filter === "nieuw" ? "Geen nieuwe aanvragen" : "Geen aanvragen"}</p>
          <p className="text-sm text-muted-foreground">Zodra een klant een aanvraag doet, staat die hier.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {zichtbaar.map((l) => {
            const nieuw = l.status === "NIEUW";
            const tel = l.telefoonnummer?.replace(/[^0-9+]/g, "") || null;
            return (
              <li key={l.id} className="flex items-stretch border-b border-border last:border-b-0">
                <button type="button" onClick={() => onSelect(l.id)} className="flex min-h-20 min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-base text-foreground", nieuw ? "font-bold" : "font-medium")}>{l.naam}</span>
                    <span className="block break-words text-sm text-muted-foreground">
                      {eersteRegelNaam(l.snapshot)} · {relatieveTijd(l.createdAt)}
                    </span>
                    <LocatieLabels snapshot={l.snapshot} className="mt-1" />
                    {l.voortgang.actie && <span className="mt-0.5 block text-sm font-medium text-foreground">Volgende: {l.voortgang.actie.label}</span>}
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", nieuw ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>{FASE_LABEL[l.voortgang.fase]}</span>
                      {l.voortgang.teLaatDagen ? <span className="inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{l.voortgang.teLaatDagen} d te laat</span> : null}
                      {l.offerte && <OfferteStatusBadge offerte={l.offerte} fase={l.voortgang.fase} />}
                      {l.offerte && !l.offerte.reactieGezien && <span className="animate-soft-pulse h-2 w-2 rounded-full bg-accent" aria-label="Klant heeft gereageerd" />}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-base tabular-nums text-foreground", nieuw ? "font-bold" : "font-semibold")}>{formatCurrency(l.totaalIndicatie)}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <div className="flex items-center pr-1">
                  <DropdownMenu
                    ariaLabel={`Snelle acties voor ${l.naam}`}
                    className="h-11 w-11"
                    items={[
                      ...(tel ? [{ label: "Bellen", icon: Phone, onSelect: () => (window.location.href = `tel:${tel}`) }] : []),
                      ...(l.telefoonnummer ? [{ label: "WhatsApp", icon: MessageCircle, onSelect: () => window.open(whatsappLink(l.telefoonnummer!), "_blank", "noopener") }] : []),
                      { label: "Markeer als afgehandeld", icon: Check, disabled: l.status === "EXTERN_AFGEHANDELD", onSelect: () => setAfhandelId(l.id) },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {afhandelId && <AfhandelKeuzeModal open onClose={() => setAfhandelId(null)} leadId={afhandelId} startStap="notitie" />}
    </div>
  );
}
