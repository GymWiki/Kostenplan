import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { FUNNEL_VOLGORDE, pivotFunnel, type FunnelRij } from "@/app/lib/gast-funnel";

export const metadata: Metadata = { title: "Probeer-funnel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Alleen voor de eigenaar (ADMIN_USER_IDS, komma-gescheiden user-ids). Voor
// iedereen anders bestaat deze pagina niet.
export default async function ProbeerFunnelPage() {
  // Zonder ADMIN_USER_IDS is dit overzicht voor niemand bereikbaar.
  const toegestaan = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (toegestaan.length === 0) notFound();
  const user = await requireUser();
  if (!toegestaan.includes(user.id)) notFound();

  const rijen = await prisma.$queryRaw<{ week: Date; bron: string; type: string; aantal: number }[]>`
    select date_trunc('week', "createdAt") as week, bron, type,
           count(distinct coalesce(sessie, id))::int as aantal
    from "GastGebeurtenis"
    where "createdAt" > now() - interval '12 weeks'
    group by 1, 2, 3
  `;
  const data: FunnelRij[] = rijen.map((r) => ({ week: r.week.toISOString().slice(0, 10), bron: r.bron, type: r.type, aantal: r.aantal }));

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Probeer-funnel</h1>
        <p className="text-muted-foreground">Laatste 12 weken, unieke bezoekers of sessies per stap. Zonder persoonsgegevens.</p>
      </div>
      <Tabel titel="Per week" kop="Week vanaf" rijen={pivotFunnel(data, "week")} />
      <Tabel titel="Per bron" kop="Bron" rijen={pivotFunnel(data, "bron")} />
    </main>
  );
}

function Tabel({ titel, kop, rijen }: { titel: string; kop: string; rijen: { naam: string; waarden: Record<string, number> }[] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{titel}</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-sm tabular-nums">
          <thead className="bg-secondary text-xs">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">{kop}</th>
              {FUNNEL_VOLGORDE.map((t) => (
                <th key={t} scope="col" className="px-3 py-2 text-right font-semibold">{t.replaceAll("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rijen.length === 0 && (
              <tr><td className="px-3 py-4 text-muted-foreground" colSpan={FUNNEL_VOLGORDE.length + 1}>Nog geen gegevens.</td></tr>
            )}
            {rijen.map((r) => (
              <tr key={r.naam} className="border-t border-border">
                <th scope="row" className="px-3 py-2 font-medium">{r.naam}</th>
                {FUNNEL_VOLGORDE.map((t) => (
                  <td key={t} className="px-3 py-2 text-right">{r.waarden[t] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
