"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Building2, ChevronRight, CreditCard, FileText, LogOut, MapPin, Palette, SlidersHorizontal, UserRound } from "lucide-react";
import { KopInstellen } from "@/app/components/mobile/mobiele-kop";
import { logoutAction } from "@/app/lib/actions/auth";

export type ProfielScherm = "tarieven" | "werkgebied" | "bedrijf" | "offertegegevens" | "uiterlijk" | "abonnement" | "meldingen" | "account";

type Rij = { id: ProfielScherm; titel: string; samenvatting: string; icoon: React.ComponentType<{ className?: string }> };

// Profiel als gegroepeerde lijst (zoals de iOS-instellingen): elke rij opent
// een eigen scherm (?scherm=…), zodat de terugknop van de telefoon werkt.
export function ProfielMobiel({
  schermen,
  samenvattingen,
  meldingenBeschikbaar,
}: {
  schermen: Record<ProfielScherm, React.ReactNode>;
  samenvattingen: Record<ProfielScherm, string>;
  meldingenBeschikbaar: boolean;
}) {
  const scherm = useSearchParams().get("scherm") as ProfielScherm | null;
  const actief = scherm && scherm in schermen ? scherm : null;

  const groepen: Rij[][] = [
    [
      { id: "tarieven", titel: "Tarieven", samenvatting: samenvattingen.tarieven, icoon: SlidersHorizontal },
      { id: "werkgebied", titel: "Werkgebied en minimum", samenvatting: samenvattingen.werkgebied, icoon: MapPin },
      { id: "bedrijf", titel: "Bedrijf", samenvatting: samenvattingen.bedrijf, icoon: Building2 },
      { id: "offertegegevens", titel: "Offertegegevens", samenvatting: samenvattingen.offertegegevens, icoon: FileText },
      { id: "uiterlijk", titel: "Uiterlijk", samenvatting: samenvattingen.uiterlijk, icoon: Palette },
    ],
    [
      { id: "abonnement", titel: "Abonnement", samenvatting: samenvattingen.abonnement, icoon: CreditCard },
      ...(meldingenBeschikbaar ? [{ id: "meldingen" as const, titel: "Meldingen", samenvatting: samenvattingen.meldingen, icoon: Bell }] : []),
      { id: "account", titel: "Account", samenvatting: samenvattingen.account, icoon: UserRound },
    ],
  ];

  if (actief) {
    const titel = [...groepen.flat()].find((r) => r.id === actief)?.titel ?? "Profiel";
    return (
      <div className="flex flex-col gap-4 pb-8 md:hidden">
        <KopInstellen titel={titel} terug="/dashboard/profiel" />
        {schermen[actief]}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8 md:hidden">
      {groepen.map((groep, i) => (
        <ul key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          {groep.map((r) => {
            const Icoon = r.icoon;
            return (
              <li key={r.id} className="border-b border-border last:border-b-0">
                <Link href={`/dashboard/profiel?scherm=${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icoon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">{r.titel}</span>
                    <span className="block truncate text-sm text-muted-foreground">{r.samenvatting}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
      <form action={logoutAction}>
        <button type="submit" className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 text-left text-base font-semibold text-destructive">
          <LogOut className="h-5 w-5" aria-hidden="true" /> Uitloggen
        </button>
      </form>
    </div>
  );
}
