import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { requireActiveCompany } from "@/app/lib/dal";
import { laadExportFacturen } from "@/app/lib/factuur/export-server";
import { dagenTeLaat } from "@/app/lib/factuur/betaling";
import { FACTUUR_STATUS_LABEL } from "@/app/lib/factuur/model";
import { formatCents, formatDatum } from "@/app/lib/offerte/weergave";
import { meervoud } from "@/app/lib/meervoud";

export const metadata: Metadata = { title: "Facturen" };

const STATUSSEN = ["DEFINITIEF", "VERSTUURD", "DEELS_BETAALD", "BETAALD", "GECREDITEERD"] as const;

// Overzicht van alle definitieve facturen en creditnota's, met filters en export voor de boekhouder.
export default async function FacturenPagina({ searchParams }: { searchParams: Promise<{ van?: string; tot?: string; status?: string; q?: string }> }) {
  const { company } = await requireActiveCompany();
  const p = await searchParams;
  const status = STATUSSEN.find((s) => s === p.status) ?? null;
  const rijen = await laadExportFacturen(company.id, { van: p.van, tot: p.tot, status });
  const q = (p.q ?? "").trim().toLowerCase();
  const zichtbaar = (q ? rijen.filter((r) => `${r.nummer} ${r.inhoud.klant.naam} ${r.inhoud.klant.bedrijfsnaam}`.toLowerCase().includes(q)) : rijen).slice().reverse();
  const totaal = zichtbaar.reduce((s, r) => s + r.totaalInclCenten, 0);
  const open = zichtbaar.reduce((s, r) => s + (r.type === "CREDITNOTA" ? 0 : Math.max(0, r.totaalInclCenten - r.betaaldCenten - r.gecrediteerdCenten)), 0);
  const exportQuery = new URLSearchParams();
  if (p.van) exportQuery.set("van", p.van);
  if (p.tot) exportQuery.set("tot", p.tot);
  if (status) exportQuery.set("status", status);
  const href = (formaat: string, extra = "") => `/api/facturen/export?${new URLSearchParams({ ...Object.fromEntries(exportQuery), formaat }).toString()}${extra}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Facturen</h1>
        <p className="mt-1 text-muted-foreground">Alle definitieve facturen en creditnota’s. Een factuur maak je vanuit de lead.</p>
      </div>

      <form method="get" className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          Van
          <input type="date" name="van" defaultValue={p.van ?? ""} className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          Tot en met
          <input type="date" name="tot" defaultValue={p.tot ?? ""} className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal" />
        </label>
        <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-sm font-semibold md:col-span-1">
          Status
          <select name="status" defaultValue={status ?? ""} className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal">
            <option value="">Alle</option>
            {STATUSSEN.map((s) => <option key={s} value={s}>{FACTUUR_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-sm font-semibold md:col-span-1">
          Zoeken
          <input type="search" name="q" defaultValue={p.q ?? ""} placeholder="Nummer of klant" className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal" />
        </label>
        <button type="submit" className="col-span-2 h-11 cursor-pointer self-end rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground md:col-span-1">Filteren</button>
      </form>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Facturen</dt><dd className="text-lg font-bold tabular-nums">{zichtbaar.length}</dd></div>
        <div><dt className="text-muted-foreground">Totaal incl. btw</dt><dd className="text-lg font-bold tabular-nums">{formatCents(totaal)}</dd></div>
        <div><dt className="text-muted-foreground">Openstaand</dt><dd className="text-lg font-bold tabular-nums">{formatCents(open)}</dd></div>
      </dl>

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Geen facturen gevonden voor deze selectie.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {zichtbaar.map((r) => {
            const openR = r.type === "CREDITNOTA" ? 0 : Math.max(0, r.totaalInclCenten - r.betaaldCenten - r.gecrediteerdCenten);
            const laat = dagenTeLaat({ vervaldatum: r.vervaldatum, status: r.status as never, openstaandCenten: openR });
            return (
              <li key={r.id} className="border-b border-border last:border-b-0">
                <Link href={`/dashboard/facturen/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-foreground">{r.nummer} · {r.inhoud.klant.bedrijfsnaam || r.inhoud.klant.naam}</span>
                    <span className="block truncate text-sm text-muted-foreground">{r.factuurdatum ? formatDatum(r.factuurdatum) : ""}{openR > 0 ? ` · ${formatCents(openR)} openstaand` : ""}</span>
                  </span>
                  {laat ? <Badge variant="warning">{meervoud(laat, "dag", "dagen")} te laat</Badge> : null}
                  <Badge variant={r.status === "BETAALD" ? "success" : "default"}>{FACTUUR_STATUS_LABEL[r.status as keyof typeof FACTUUR_STATUS_LABEL]}</Badge>
                  <span className="shrink-0 text-base font-semibold tabular-nums">{formatCents(r.totaalInclCenten)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="export-kop" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 id="export-kop" className="text-base font-bold">Exporteren voor je boekhouder</h2>
        <p className="text-sm text-muted-foreground">
          Je export bevat de facturen in de gekozen periode en status. De CSV heeft per factuur het bedrag per btw-tarief, wat is betaald en wat openstaat. De ZIP bevat ook de PDF’s zoals ze zijn verstuurd, en op verzoek een UBL-bestand per factuur.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary" href={href("csv")}>CSV downloaden</a>
          <a className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary" href={href("zip")}>ZIP met PDF’s</a>
          <a className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary" href={href("zip", "&ubl=1")}>ZIP met PDF’s en UBL</a>
        </div>
        <p className="text-xs text-muted-foreground">Kostenplan is geen boekhoudpakket. Gebruik de export om je facturen in te lezen in je administratie of aan je boekhouder te geven. Facturen moet je 7 jaar bewaren.</p>
      </section>
    </div>
  );
}
