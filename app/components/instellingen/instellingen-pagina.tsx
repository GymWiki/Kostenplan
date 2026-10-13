"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { KopInstellen } from "@/app/components/mobile/mobiele-kop";
import { InstellingenKolom } from "./settings";

// Detailpagina van Profiel: op de telefoon de gedeelde kop met terug en titel, op desktop een kop met terugkoppeling.
export function InstellingenPagina({ titel, terug = "/dashboard/profiel", terugLabel = "Profiel", children }: { titel: string; terug?: string; terugLabel?: string; children: React.ReactNode }) {
  return (
    <InstellingenKolom>
      <KopInstellen titel={titel} terug={terug} />
      <div className="hidden flex-col gap-1 md:flex">
        <Link href={terug} className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {terugLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">{titel}</h1>
      </div>
      {children}
    </InstellingenKolom>
  );
}
