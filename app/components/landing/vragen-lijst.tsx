"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

export type Vraag = { vraag: string; antwoord: string; meer?: React.ReactNode };

// Uitklapbare vragen. Alle antwoorden staan in de pagina (alleen verborgen met het hidden-attribuut), zodat zoekmachines en AI de tekst lezen;
// meerdere vragen kunnen tegelijk open staan.
export function VragenLijst({ vragen }: { vragen: Vraag[] }) {
  const basis = useId();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const wissel = (i: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="mt-10 border-t border-lp-lijn">
      {vragen.map((v, i) => {
        const aan = open.has(i);
        return (
          <div key={v.vraag} className="border-b border-lp-rand">
            <h3>
              <button
                type="button"
                id={`${basis}-k${i}`}
                aria-expanded={aan}
                aria-controls={`${basis}-p${i}`}
                onClick={() => wissel(i)}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-lg font-semibold leading-snug sm:text-xl"
              >
                <span className="min-w-0">{v.vraag}</span>
                <ChevronDown aria-hidden="true" className={cn("h-5 w-5 shrink-0 text-lp-bos-800 transition-transform duration-200 motion-reduce:transition-none", aan && "rotate-180")} />
              </button>
            </h3>
            <div id={`${basis}-p${i}`} role="region" aria-labelledby={`${basis}-k${i}`} hidden={!aan} className="pb-6">
              <p className="max-w-3xl text-lg leading-relaxed">{v.antwoord}</p>
              {v.meer && <p className="mt-2 text-base">{v.meer}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
