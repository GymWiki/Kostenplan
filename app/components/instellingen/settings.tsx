import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Eén set bouwstenen voor alle instellingenpagina's (Profiel en de detailpagina's): dezelfde groepskop, dezelfde
// regel (icoon, titel, één regel samenvatting, chevron, minimaal 56 px) en dezelfde waarschuwing.

export function SettingsGroup({ kop, children, className }: { kop?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={kop} className={cn("flex flex-col gap-2", className)}>
      {kop && <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kop}</h2>}
      <ul className="overflow-hidden rounded-xl border border-border bg-card">{children}</ul>
    </section>
  );
}

export const rijBasis = "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left";
const focus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

export function SettingsIcon({ icoon: Icoon }: { icoon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
      <Icoon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

// Samenvatting in één regel; met `waarschuwing` een oranje stip en een concrete tekst in plaats van de samenvatting.
export function Samenvatting({ tekst, waarschuwing }: { tekst?: React.ReactNode; waarschuwing?: string | null }) {
  if (waarschuwing) {
    return (
      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        <span className="truncate">{waarschuwing}</span>
      </span>
    );
  }
  return tekst ? <span className="block truncate text-sm text-muted-foreground">{tekst}</span> : null;
}

export function SettingsRow({
  href,
  icoon,
  titel,
  samenvatting,
  waarschuwing,
  rechts,
  geenChevron,
}: {
  href: string;
  icoon: React.ComponentType<{ className?: string }>;
  titel: string;
  samenvatting?: React.ReactNode;
  waarschuwing?: string | null;
  // Extra inhoud vóór de chevron (bijv. kleurstalen).
  rechts?: React.ReactNode;
  geenChevron?: boolean;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link href={href} className={cn(rijBasis, "hover:bg-secondary/50", focus)}>
        <SettingsIcon icoon={icoon} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">{titel}</span>
          <Samenvatting tekst={samenvatting} waarschuwing={waarschuwing} />
        </span>
        {rechts}
        {!geenChevron && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </Link>
    </li>
  );
}

// Een regel zonder navigatie (alleen tonen), in dezelfde vorm.
export function SettingsInfoRow({ icoon, titel, samenvatting, waarschuwing }: { icoon: React.ComponentType<{ className?: string }>; titel: string; samenvatting?: React.ReactNode; waarschuwing?: string | null }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <div className={rijBasis}>
        <SettingsIcon icoon={icoon} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">{titel}</span>
          <Samenvatting tekst={samenvatting} waarschuwing={waarschuwing} />
        </span>
      </div>
    </li>
  );
}

// De kolom waarin alle instellingenpagina's staan: één kolom, op desktop maximaal 640 px.
export function InstellingenKolom({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex w-full max-w-[640px] flex-col gap-6", className)}>{children}</div>;
}
