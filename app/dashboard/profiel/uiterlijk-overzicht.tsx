import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui/card";

export type BrandingRegel = { toolId: string; toolNaam: string; logoUrl: string | null; primaireKleur: string };

// Alleen-lezen: de huisstijl wordt aangepast in de rekentool zelf (klik op de kop).
export function UiterlijkOverzicht({ regels }: { regels: BrandingRegel[] }) {
  if (regels.length === 0) {
    return <p className="text-sm text-muted-foreground">Zodra je een rekentool hebt, zie je hier het uiterlijk ervan.</p>;
  }
  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {regels.map((r) => (
          <div key={r.toolId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            {r.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- extern logo, afmetingen onbekend
              <img src={r.logoUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary text-xs text-muted-foreground" aria-hidden="true">
                –
              </span>
            )}
            <span className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ backgroundColor: r.primaireKleur }} role="img" aria-label={`Hoofdkleur ${r.primaireKleur}`} />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.toolNaam}</p>
            <Link
              href={`/dashboard/tools/${r.toolId}?paneel=uiterlijk`}
              className="rounded-md text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Aanpassen in je rekentool
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
