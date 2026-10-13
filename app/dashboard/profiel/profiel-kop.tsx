"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Plus } from "lucide-react";
import { Sheet } from "@/app/components/ui/sheet";
import { switchActiveCompanyAction } from "@/app/lib/actions/companies";
import { initialen } from "@/app/lib/profiel/samenvattingen";

// Kop van Profiel: logo (of initialen), bedrijfsnaam en domein; geheel klikbaar naar Bedrijfsgegevens. Bij meer dan
// één bedrijf staat rechts een knop "Wisselen" die een sheet met de bedrijven opent.
export function ProfielKop({ actief, bedrijven }: { actief: { id: string; naam: string; logoUrl: string | null; domein: string | null }; bedrijven: { id: string; naam: string }[] }) {
  const [open, setOpen] = useState(false);
  const meerdere = bedrijven.length > 1;
  return (
    <>
      <div className="flex min-h-[72px] items-center gap-2 rounded-xl border border-border bg-card pr-3">
        <Link href="/dashboard/profiel/bedrijfsgegevens" className="flex min-w-0 flex-1 items-center gap-4 rounded-xl py-3 pl-4 hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          {actief.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- extern logo, afmetingen onbekend
            <img src={actief.logoUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg border border-border bg-white object-contain" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary" aria-hidden="true">
              {initialen(actief.naam)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-semibold text-foreground">{actief.naam}</span>
            {actief.domein && <span className="block truncate text-sm text-muted-foreground">{actief.domein}</span>}
          </span>
          {!meerdere && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        </Link>
        {meerdere && (
          <button type="button" onClick={() => setOpen(true)} className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Wisselen
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Bedrijf wisselen">
        <ul className="overflow-hidden rounded-xl border border-border">
          {bedrijven.map((b) => (
            <li key={b.id} className="border-b border-border last:border-b-0">
              <form action={switchActiveCompanyAction}>
                <input type="hidden" name="companyId" value={b.id} />
                <input type="hidden" name="redirectTo" value="profiel" />
                <button type="submit" aria-current={b.id === actief.id ? "true" : undefined} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-left hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                  <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{b.naam}</span>
                  {b.id === actief.id && <Check className="h-5 w-5 shrink-0 text-primary" aria-label="Actief bedrijf" />}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <Link href="/dashboard/bedrijven/nieuw" className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-base font-medium text-primary hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Plus className="h-5 w-5" aria-hidden="true" /> Bedrijf toevoegen
        </Link>
      </Sheet>
    </>
  );
}
