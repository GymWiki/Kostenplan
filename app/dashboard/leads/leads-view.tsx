"use client";

import { useCallback, useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LayoutGrid, List, TrendingUp, Users, Trophy, Target } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatCurrency } from "@/app/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { HelpTip } from "@/app/components/ui/help-tip";
import { ProFeatureLock } from "@/app/components/dashboard/pro-feature-lock";
import { updateLeadStatusAction } from "@/app/lib/actions/leads";
import { telItMeeVoorPipeline } from "@/app/lib/leads";
import { FaseChips } from "./fase-chips";
import { FASE_FILTERS, valtOnderFilter, type FaseFilter } from "@/app/lib/lead-fase";
import { LeadsTable } from "./leads-table";
import { MARKERING_FILTER_OPTIES, leadMarkeringen } from "@/app/lib/werkgebied/lead-markeringen";
import { LeadDetailDrawer, type LeadStart } from "./lead-detail-drawer";
import { LeadsMobiel, type LeadFilter } from "./leads-mobiel";
import type { Lead, LeadNote, LeadStatus, Offerte, OfferteV2Status } from "@/app/generated/prisma/client";
import { OFFERTE_FILTER_OPTIES, leadOfferteStatus } from "@/app/lib/offerte/lead-status";
import type { LeadVoortgang } from "@/app/lib/lead-voortgang";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteRegel } from "@/app/lib/offertes";
import type { HelpContentKey } from "@/app/lib/helpContent";

export type LeadWithNotes = Omit<Lead, "snapshot"> & {
  snapshot: LeadSnapshot;
  notities: LeadNote[];
  voortgang: LeadVoortgang;
  offerte: (Omit<Offerte, "regels"> & { regels: OfferteRegel[]; v2Status?: OfferteV2Status }) | null;
};

type View = "kanban" | "lijst";

// Performance-audit (Fase 2, P1.2): @dnd-kit hoeft alleen geladen te worden
// als de gebruiker daadwerkelijk het Bord bekijkt — de Lijst-weergave (ook de
// mobiele standaard, zie useIsNarrowViewport hieronder) heeft het nooit nodig.
const KanbanBoard = dynamic(() => import("./kanban-board").then((mod) => mod.KanbanBoard), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  ),
});

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
  tools = [],
  startPerTool = {},
}: {
  leads: LeadWithNotes[];
  isGratis: boolean;
  tools?: { id: string; naam: string }[];
  // Het startadres en de straal van het werkgebied per rekentool, voor de kaart in het leaddetail.
  startPerTool?: Record<string, LeadStart>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Weergave en toolfilter leven in de URL (?weergave=&tool=) i.p.v. lokale
  // state — zo overleven ze verversen, delen en terugnavigeren (Web
  // Interface Guidelines: "URL reflects state"). Afwezig in de URL = nog
  // geen expliciete keuze door de gebruiker gemaakt — dan geldt de
  // viewport-afhankelijke standaard hieronder, precies zoals de vorige
  // `gekozenView === null`-staat werkte.
  const gekozenView = searchParams.get("weergave") as View | null;
  const isNarrow = useIsNarrowViewport();
  // Het bord stapelt op een smal scherm al zijn statuskolommen verticaal —
  // veel minder bruikbaar dan de Lijst-weergave daar.
  const view: View = gekozenView ?? (isNarrow ? "lijst" : "kanban");
  // ?lead=<id> (vanaf "Vandaag") opent meteen die aanvraag.
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => searchParams.get("lead"));
  // "alle" = company-brede weergave (standaard) — een gebruiker met precies
  // één rekentool ziet deze filter niet eens (zie de check bij het renderen
  // hieronder), voor hen is "alle" en "die ene tool" toch hetzelfde.
  const toolFilter = searchParams.get("tool") ?? "alle";
  // Filter op offertestatus (?offerte=geaccepteerd, enz.).
  const offerteFilter = searchParams.get("offerte") ?? "alle";
  // Filter op werkgebied en minimum (?markering=buiten|minimum|niet-gecontroleerd).
  const markeringFilter = searchParams.get("markering") ?? "alle";
  // Filter op fase (?fase=nieuw|offerte|akkoord|te-factureren|openstaand|te-laat|afgerond).
  const faseParam = searchParams.get("fase");
  const faseFilter: FaseFilter = FASE_FILTERS.some((f) => f.waarde === faseParam) ? (faseParam as FaseFilter) : "alle";

  const updateQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value == null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const setGekozenView = useCallback((next: View) => updateQuery({ weergave: next }), [updateQuery]);
  const setToolFilter = useCallback((next: string) => updateQuery({ tool: next === "alle" ? null : next }), [updateQuery]);

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

  // Mobiele statusfilter (?status=): zonder keuze starten we bij Nieuw als er
  // nieuwe aanvragen zijn, anders bij Open.
  const heeftNieuw = optimisticLeads.some((l) => l.voortgang.fase === "nieuw");
  const statusParam = searchParams.get("status");
  // Met een fasefilter (chips) tonen we altijd alles wat daaronder valt.
  const mobielFilter: LeadFilter = faseFilter !== "alle" ? "alles" : statusParam === "nieuw" || statusParam === "open" || statusParam === "alles" ? statusParam : heeftNieuw ? "nieuw" : "open";

  const selectedLead = optimisticLeads.find((lead) => lead.id === selectedLeadId) ?? null;

  const opToolLeads = useMemo(() => (toolFilter === "alle" ? optimisticLeads : optimisticLeads.filter((lead) => lead.toolId === toolFilter)), [optimisticLeads, toolFilter]);
  const zichtbareLeads = useMemo(() => {
    const opTool = faseFilter === "alle" ? opToolLeads : opToolLeads.filter((lead) => valtOnderFilter(lead.voortgang, faseFilter));
    const opOfferte = offerteFilter === "alle" ? opTool : opTool.filter((lead) => leadOfferteStatus(lead).sleutel === offerteFilter);
    const soort = MARKERING_FILTER_OPTIES.find((o) => o.waarde === markeringFilter)?.soort ?? null;
    return soort ? opOfferte.filter((lead) => leadMarkeringen(lead.snapshot).includes(soort)) : opOfferte;
  }, [opToolLeads, faseFilter, offerteFilter, markeringFilter]);
  // Het filter verschijnt pas als er iets te filteren valt.
  const toonMarkeringFilter = useMemo(() => optimisticLeads.some((lead) => leadMarkeringen(lead.snapshot).length > 0), [optimisticLeads]);

  // Zelfde berekening als voorheen server-side in page.tsx, nu hier zodat de
  // KPI's direct meebewegen met een optimistische statuswijziging in plaats
  // van pas na de server-round-trip bij te trekken. Beweegt ook mee met het
  // toolfilter hierboven.
  const { pipelineWaarde, actieveCount, gewonnenCount, conversieRatio } = useMemo(() => {
    const actief = zichtbareLeads.filter((lead) => telItMeeVoorPipeline(lead.status));
    const waarde = actief.reduce((sum, lead) => sum + lead.totaalIndicatie, 0);
    const gewonnen = zichtbareLeads.filter((lead) => lead.status === "GEWONNEN").length;
    const verloren = zichtbareLeads.filter((lead) => lead.status === "VERLOREN").length;
    const afgerond = gewonnen + verloren;
    return {
      pipelineWaarde: waarde,
      actieveCount: actief.length,
      gewonnenCount: gewonnen,
      conversieRatio: afgerond > 0 ? Math.round((gewonnen / afgerond) * 100) : null,
    };
  }, [zichtbareLeads]);

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
          title="Leads ontvangen?"
          description="Vanaf Plus verschijnt elke lead die een klant via je rekentool achterlaat direct hier, inclusief contactgegevens en prijsindicatie. Upgrade naar Plus of Pro om leads binnen te laten komen."
          ctaLabel="Upgrade naar Plus of Pro"
        />
      </div>
    );
  }

  const chips = (
    <div className="flex flex-col gap-1">
      <FaseChips leads={opToolLeads} waarde={faseFilter} onKies={(f) => updateQuery({ fase: f === "alle" ? null : f })} />
      <Link href="/dashboard/facturen" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-primary underline-offset-2 hover:underline">Alle facturen en export</Link>
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="md:hidden">{chips}</div>
      <LeadsMobiel
        leads={zichtbareLeads}
        filter={mobielFilter}
        onFilter={(f) => updateQuery({ status: f })}
        tools={tools}
        toolFilter={toolFilter}
        onToolFilter={setToolFilter}
        offerteFilter={offerteFilter}
        onOfferteFilter={(v) => updateQuery({ offerte: v === "alle" ? null : v })}
        markeringFilter={markeringFilter}
        onMarkeringFilter={(v) => updateQuery({ markering: v === "alle" ? null : v })}
        toonMarkeringFilter={toonMarkeringFilter}
        onSelect={setSelectedLeadId}
      />
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Offerte-aanvragen vanuit je klantenportaal, op één plek.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tools.length > 1 && (
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              aria-label="Filter op rekentool"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="alle">Alle rekentools</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.naam}
                </option>
              ))}
            </select>
          )}
          <select
            value={offerteFilter}
            onChange={(e) => updateQuery({ offerte: e.target.value === "alle" ? null : e.target.value })}
            aria-label="Filter op offertestatus"
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            {OFFERTE_FILTER_OPTIES.map((o) => (
              <option key={o.waarde} value={o.waarde}>
                {o.label}
              </option>
            ))}
          </select>
          {toonMarkeringFilter && (
            <select
              value={markeringFilter}
              onChange={(e) => updateQuery({ markering: e.target.value === "alle" ? null : e.target.value })}
              aria-label="Filter op werkgebied en minimum"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MARKERING_FILTER_OPTIES.map((o) => (
                <option key={o.waarde} value={o.waarde}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setGekozenView("kanban")}
              aria-pressed={view === "kanban"}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                view === "kanban"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Bord
            </button>
            <button
              type="button"
              onClick={() => setGekozenView("lijst")}
              aria-pressed={view === "lijst"}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                view === "lijst"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              Lijst
            </button>
          </div>
          <HelpTip contentKey="leads.statusKolommen" />
        </div>
      </div>

      <div className="hidden md:block">{chips}</div>

      <div className="hidden gap-4 md:grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <KpiCard
          icon={TrendingUp}
          label="Pipeline waarde"
          value={formatCurrency(pipelineWaarde)}
          hint="Actieve leads"
          help="leads.pipelineWaarde"
        />
        <KpiCard icon={Users} label="Actieve leads" value={String(actieveCount)} />
        <KpiCard icon={Trophy} label="Gewonnen" value={String(gewonnenCount)} />
        <KpiCard
          icon={Target}
          label="Conversieratio"
          value={conversieRatio === null ? "—" : `${conversieRatio}%`}
          hint="Gewonnen t.o.v. afgerond"
        />
      </div>

      {zichtbareLeads.length === 0 ? (
        <Card className="hidden md:block">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-medium text-foreground">Nog geen leads</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {toolFilter === "alle"
                ? "Zodra een bezoeker via je rekentool een offerte aanvraagt, verschijnt die hier."
                : "Deze rekentool heeft nog geen leads."}
            </p>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <div className="hidden md:block">
          <KanbanBoard
            leads={zichtbareLeads}
            showTool={tools.length > 1}
            onSelectLead={setSelectedLeadId}
            onUpdateStatus={updateLeadStatus}
          />
        </div>
      ) : (
        <div className="hidden md:block">
          <LeadsTable
            leads={zichtbareLeads}
            showTool={tools.length > 1}
            onSelectLead={setSelectedLeadId}
            onUpdateStatus={updateLeadStatus}
          />
        </div>
      )}

      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLeadId(null)}
        onUpdateStatus={updateLeadStatus}
        start={selectedLead ? (startPerTool[selectedLead.toolId] ?? null) : null}
        toolBestaat={selectedLead ? (tools ?? []).some((t) => t.id === selectedLead.toolId) : false}
      />
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
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">{label}</span>
          {help && <HelpTip contentKey={help} />}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
