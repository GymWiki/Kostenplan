import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { formatCurrency } from "@/app/lib/format";
import { LEAD_STATUS_LABELS } from "@/app/lib/leads";
import type { LeadStatus } from "@/app/generated/prisma/client";

export type RecenteAanvraag = {
  id: string;
  naam: string;
  toolNaamSnapshot: string;
  status: LeadStatus;
  totaalIndicatie: number;
  createdAt: Date;
};

const STATUS_BADGE_VARIANT: Record<LeadStatus, "default" | "success" | "warning" | "outline" | "muted"> = {
  NIEUW: "default",
  IN_BEHANDELING: "warning",
  OFFERTE_VERSTUURD: "outline",
  GEWONNEN: "success",
  VERLOREN: "muted",
  EXTERN_AFGEHANDELD: "muted",
};

// Kort, relatief tijdsverloop i.p.v. een volle datum — bij "recente
// activiteit" is "2 uur geleden" bruikbaarder dan "01-09-2026". Valt terug op
// een korte datum zodra het langer dan een week geleden is (dan is "geleden"
// niet meer precies genoeg om nuttig te zijn).
function relatieveTijd(datum: Date) {
  const diffMin = Math.floor((Date.now() - datum.getTime()) / 60000);
  if (diffMin < 1) return "Zojuist";
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffUur = Math.floor(diffMin / 60);
  if (diffUur < 24) return `${diffUur} u geleden`;
  const diffDagen = Math.floor(diffUur / 24);
  if (diffDagen === 1) return "Gisteren";
  if (diffDagen < 7) return `${diffDagen} dagen geleden`;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(datum);
}

// UX-audit punt 5: vult de lege ruimte na de statistiekkaarten op
// /dashboard en de tool-overzichtpagina met een lichtgewicht lijst i.p.v.
// een nieuwe databron te introduceren — Lead wordt op beide plekken al
// geteld (StatCard "Aanvragen"/"Leads"); dit hergebruikt exact diezelfde
// tabel, nu met de laatste paar rijen in plaats van alleen een aantal.
// `toonTool`: op de company-brede /dashboard komen aanvragen van
// verschillende tools door elkaar, dus daar staat de toolnaam erbij; op de
// al-tool-gescoped tool-overzichtpagina is dat overbodig.
export function RecenteAanvragen({
  aanvragen,
  toonTool,
  bekijkAlleHref,
}: {
  aanvragen: RecenteAanvraag[];
  toonTool: boolean;
  bekijkAlleHref: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Recente aanvragen</CardTitle>
        {aanvragen.length > 0 && (
          <Link
            href={bekijkAlleHref}
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Alle aanvragen
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {aanvragen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">Hier verschijnen aanvragen zodra klanten je rekentool invullen.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {aanvragen.map((aanvraag) => (
              <li key={aanvraag.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{aanvraag.naam}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {toonTool ? `${aanvraag.toolNaamSnapshot} — ` : ""}
                    {relatieveTijd(aanvraag.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {formatCurrency(aanvraag.totaalIndicatie)}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[aanvraag.status]} className="whitespace-nowrap">
                    {LEAD_STATUS_LABELS[aanvraag.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
