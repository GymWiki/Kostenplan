import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { isHerinneringTip, OFFERTE_TIP_TEKST, type OfferteTip } from "@/app/lib/offerte/tips";

// Meldingen over offertes: reacties van klanten en herinneringen. Alleen links; niets wordt automatisch verstuurd.
export function OfferteTips({ tips, titel = "Offertes" }: { tips: OfferteTip[]; titel?: string }) {
  if (tips.length === 0) return null;
  return (
    <section aria-labelledby="offerte-tips" className="flex flex-col gap-2">
      <h2 id="offerte-tips" className="flex items-center gap-2 text-base font-bold text-foreground">
        <Bell className="h-4 w-4" aria-hidden="true" /> {titel}
      </h2>
      <ul className="overflow-hidden rounded-xl border border-border bg-card">
        {tips.map((t) => {
          const herinnering = isHerinneringTip(t.soort);
          return (
            <li key={`${t.offerteId}-${t.soort}`} className="border-b border-border last:border-b-0">
              <Link
                href={`/dashboard/leads/${t.leadId}/offerte${herinnering ? "?herinnering=1" : ""}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">
                    {herinnering ? `${t.naam} · ${t.nummer}` : `${t.naam} ${OFFERTE_TIP_TEKST[t.soort]}`}
                  </span>
                  <span className="block text-sm text-muted-foreground">{herinnering ? OFFERTE_TIP_TEKST[t.soort] : `Offerte ${t.nummer}`}</span>
                </span>
                {herinnering && <span className="shrink-0 text-sm font-semibold text-primary">Herinnering sturen</span>}
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
