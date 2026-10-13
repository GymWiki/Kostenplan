import { FactuurTellers } from "@/app/components/dashboard/factuur-tellers";
import { OfferteTips } from "@/app/components/dashboard/offerte-tips";
import Link from "next/link";
import { Check, ChevronRight, Circle } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { formatCurrency } from "@/app/lib/format";
import { kiesHoofdactie, type VandaagData } from "@/app/lib/vandaag";
import { relatieveTijd } from "./recente-aanvragen";

// "Vandaag": het mobiele startscherm. Bovenaan wat aandacht nodig heeft
// (nieuwe aanvragen, offertes die wachten, rekentool afmaken), daaronder een
// kleine samenvatting, en één hoofdknop onderin.
export function VandaagMobiel({ data }: { data: VandaagData }) {
  const hoofd = kiesHoofdactie(data);
  const klaarAantal = data.checklist?.stappen.filter((s) => s.klaar).length ?? 0;

  return (
    <div className="flex flex-col gap-5 pb-24 md:hidden">
      {data.toolsTotaal === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-base text-foreground">
          Je hebt nog geen rekentool. Maak er een en zet hem op je website.
        </p>
      ) : (
        <>
          {data.nieuweLeads > 0 && (
            <section aria-labelledby="vd-nieuw" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 id="vd-nieuw" className="text-base font-bold text-foreground">
                  Nieuwe aanvragen
                </h2>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">{data.nieuweLeads}</span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {data.laatsteNieuweLeads.map((l) => (
                  <li key={l.id} className="border-b border-border last:border-b-0">
                    <Link href={`/dashboard/leads?lead=${l.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-foreground">{l.naam}</span>
                        <span className="block break-words text-sm text-muted-foreground">
                          {l.werkzaamheid} · {relatieveTijd(l.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">{formatCurrency(l.bedrag)}</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <OfferteTips tips={data.offerteTips} />
          <FactuurTellers data={data.facturen} />

          {data.wachtendeOffertes.aantal > 0 && (
            <section aria-labelledby="vd-offertes" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 id="vd-offertes" className="text-base font-bold text-foreground">
                  Wacht op reactie
                </h2>
                <span className="text-sm text-muted-foreground">{data.wachtendeOffertes.aantal} {data.wachtendeOffertes.aantal === 1 ? "offerte" : "offertes"}</span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {data.wachtendeOffertes.lijst.map((o) => (
                  <li key={o.leadId} className="border-b border-border last:border-b-0">
                    <Link href={`/dashboard/leads?lead=${o.leadId}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-foreground">{o.naam}</span>
                        <span className="block text-sm text-muted-foreground">{o.verstuurdOp ? `Verstuurd ${relatieveTijd(o.verstuurdOp).toLowerCase()}` : "Verstuurd"}</span>
                      </span>
                      <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">{formatCurrency(o.bedrag)}</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.checklist && (
            <section aria-labelledby="vd-checklist" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 id="vd-checklist" className="text-base font-bold text-foreground">
                  Maak je rekentool af
                </h2>
                <span className="text-sm text-muted-foreground">
                  {klaarAantal} van {data.checklist.stappen.length}
                </span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {data.checklist.stappen.map((s) => (
                  <li key={s.id} className="border-b border-border last:border-b-0">
                    <Link href={s.href} className="flex min-h-14 items-center gap-3 px-4 py-3">
                      {s.klaar ? (
                        <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className={s.klaar ? "flex-1 text-base text-muted-foreground line-through" : "flex-1 text-base font-medium text-foreground"}>{s.label}</span>
                      <span className="sr-only">{s.klaar ? "Klaar" : "Nog te doen"}</span>
                      {!s.klaar && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.nieuweLeads === 0 && data.wachtendeOffertes.aantal === 0 && data.offerteTips.length === 0 && !data.checklist && (
            <p className="rounded-xl border border-border bg-card p-5 text-base text-foreground">Alles is bij. Er wacht niets op je.</p>
          )}

          <section aria-label="Samenvatting" className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">{data.leadsDezeMaand}</p>
              <p className="text-sm text-muted-foreground">leads deze maand</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {data.toolsLive}
                <span className="text-base font-medium text-muted-foreground"> van {data.toolsTotaal}</span>
              </p>
              <p className="text-sm text-muted-foreground">{data.toolsLive === 1 ? "rekentool live" : "rekentools live"}</p>
            </div>
          </section>
        </>
      )}

      {hoofd && (
        <StickyActiebalk metTabbalk>
          <LinkButton href={hoofd.href} size="lg" className="w-full">
            {hoofd.label}
          </LinkButton>
        </StickyActiebalk>
      )}
    </div>
  );
}
