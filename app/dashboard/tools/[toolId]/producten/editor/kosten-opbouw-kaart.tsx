import { cn } from "@/app/lib/cn";
import { formatAantal, formatEenheid, formatEuro } from "@/app/lib/pricing/format";
import { STAP_WOORD } from "@/app/lib/werkzaamheid";
import type { KostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

// "Opbouw · alleen voor jou": wat jij verdient en waaruit de prijs bestaat.
// Nooit zichtbaar voor de klant.
export function KostenOpbouwKaart({
  opbouw,
  eenheid,
  stap,
  className,
}: {
  opbouw: KostenOpbouw;
  eenheid: string;
  stap: ArbeidStapEenheid;
  className?: string;
}) {
  const woord = STAP_WOORD[stap].enkelvoud;
  const materiaal: { label: string; bedrag: number }[] =
    opbouw.materiaalRegels.length > 1
      ? opbouw.materiaalRegels.map((m) => ({ label: `${m.omschrijving} (${formatAantal(m.aantal)} ${formatEenheid(eenheid)} × ${formatEuro(m.prijsPerEenheid)})`, bedrag: m.bedrag }))
      : [{ label: `Materiaal (${formatAantal(opbouw.hoeveelheid)} ${formatEenheid(eenheid)})`, bedrag: opbouw.materiaalRegels[0]?.bedrag ?? 0 }];
  const regels: { label: string; bedrag: number }[] = [
    ...materiaal,
    ...opbouw.extraRegels.map((e) => ({ label: e.omschrijving, bedrag: e.bedrag })),
    {
      label:
        opbouw.arbeidstijd > 0
          ? `Arbeid (${formatAantal(opbouw.arbeidstijd)} ${woord} × ${formatEuro(opbouw.arbeidTarief)})`
          : "Arbeid",
      bedrag: opbouw.arbeid,
    },
    { label: "Voorrijkosten", bedrag: opbouw.voorrijkosten },
    {
      label:
        opbouw.transportDagen != null ? `Transport (${opbouw.transportDagen} dag${opbouw.transportDagen === 1 ? "" : "en"})` : "Transport",
      bedrag: opbouw.transport,
    },
  ];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Opbouw · alleen voor jou</p>
      <dl className="text-sm">
        {regels.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1.5">
            <dt className="min-w-0 break-words text-muted-foreground">{r.label}</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-foreground">{formatEuro(r.bedrag)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 pt-2 font-bold text-foreground">
          <dt>Totaal</dt>
          <dd className="tabular-nums">{formatEuro(opbouw.totaal)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">Excl. btw.</p>
    </div>
  );
}
