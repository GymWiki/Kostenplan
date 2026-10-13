import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatCents } from "@/app/lib/offerte/weergave";
import type { FactuurOverzichtData } from "@/app/lib/factuur/overzicht";

// Facturen in Overzicht: Te factureren, Openstaand en Te laat (met totalen) en meldingen over betalingen die te laat zijn.
export function FactuurTellers({ data }: { data: FactuurOverzichtData }) {
  const { teFactureren, openstaand, teLaat, tips } = data;
  if (teFactureren.aantal + openstaand.aantal + teLaat.aantal === 0) return null;
  const kaarten = [
    { label: "Te factureren", t: teFactureren, href: "/dashboard/leads?fase=te-factureren", alarm: false },
    { label: "Openstaand", t: openstaand, href: "/dashboard/leads?fase=openstaand", alarm: false },
    { label: "Te laat", t: teLaat, href: "/dashboard/leads?fase=te-laat", alarm: teLaat.aantal > 0 },
  ];
  return (
    <section aria-labelledby="fact-tellers" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between"><h2 id="fact-tellers" className="text-base font-bold text-foreground">Facturen</h2><Link href="/dashboard/facturen" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">Alle facturen</Link></div>
      <ul className="grid grid-cols-3 gap-2">
        {kaarten.map((k) => (
          <li key={k.label}>
            <Link href={k.href} className="flex h-full min-h-20 flex-col justify-between rounded-xl border border-border bg-card p-3 hover:bg-secondary/50">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className={cn("text-xl font-bold tabular-nums", k.alarm ? "text-destructive" : "text-foreground")}>{k.t.aantal}</span>
              <span className="truncate text-xs tabular-nums text-muted-foreground">{formatCents(k.t.totaalCenten)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {tips.map((t) => (
            <li key={t.factuurId} className="border-b border-border last:border-b-0">
              <Link href={`/dashboard/facturen/${t.factuurId}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                <Bell className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">Factuur {t.nummer} is {t.dagenTeLaat} {t.dagenTeLaat === 1 ? "dag" : "dagen"} te laat</span>
                  <span className="block truncate text-sm text-muted-foreground">{t.naam} · {formatCents(t.openstaandCenten)} openstaand</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-primary">Herinnering sturen</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
