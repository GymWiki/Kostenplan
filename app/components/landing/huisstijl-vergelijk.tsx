"use client";

import { useId, useState } from "react";
import { STIJLEN, type StijlId } from "@/app/lib/landing/demo-data";
import { MaatH } from "@/app/components/landing/maat";
import { cn } from "@/app/lib/cn";

const MERKEN: StijlId[] = ["groenhof", "eikenhoek", "terlinden"];

// Voor/na: links hoe een rekentool zonder eigen huisstijl eruitziet (Gratis),
// rechts dezelfde rekentool in de huisstijl van een fictief bedrijf. Beide zijn
// de echte klant-rekentool (iframes), alleen om te bekijken.
export function HuisstijlVergelijk({ kop }: { kop?: React.ReactNode }) {
  const slider = useId();
  const [merk, setMerk] = useState<StijlId>("groenhof");
  const [pos, setPos] = useState(45);
  const stijl = STIJLEN[merk];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
      <div>
        {kop}
        <div role="group" aria-label="Kies een voorbeeldbedrijf" className="mt-6 flex flex-col border-t border-lp-lijn">
          {MERKEN.map((id) => {
            const s = STIJLEN[id];
            const aan = id === merk;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={aan}
                onClick={() => setMerk(id)}
                className={cn(
                  "flex min-h-16 cursor-pointer items-center gap-4 border-b border-lp-lijn px-1 py-3 text-left transition-colors",
                  aan ? "bg-lp-papier-2" : "hover:bg-lp-papier-2/60"
                )}
              >
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-serif text-2xl font-semibold text-white" style={{ backgroundColor: s.kleur }}>
                  {s.letter}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{s.naam}</span>
                  <span className="block font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">{s.site} · voorbeeld</span>
                </span>
                <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-lg border border-lp-lijn" style={{ backgroundColor: aan ? s.kleur : "transparent" }} />
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-base text-lp-inkt-2">
          Vul je website in en Kostenplan haalt je logo en je hoofdkleur eruit. Je klant ziet geen los programma, maar een rekentool die bij je bedrijf hoort.
        </p>
        <p className="mt-3 text-sm text-lp-inkt-2">
          Eigen logo en kleuren zijn onderdeel van Plus en Pro. In Gratis ziet je rekentool eruit zoals links.
        </p>
      </div>

      <div>
        <div className="mb-2 flex justify-between gap-2 font-lp-maat text-[11px] tracking-wide">
          <span className="rounded-lg bg-lp-inkt px-2 py-1 text-lp-papier">Voor · zonder huisstijl</span>
          <span className="rounded-lg bg-lp-oker px-2 py-1 text-lp-inkt">Na · jouw huisstijl</span>
        </div>
        <div className="relative h-[520px] overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
          <iframe
            src="/demo/rekentool/standaard"
            title="Voor: een rekentool zonder eigen huisstijl"
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
          />
          <iframe
            key={merk}
            src={`/demo/rekentool/${merk}`}
            title={`Na: dezelfde rekentool in de huisstijl van ${stijl.naam}, een fictief bedrijf`}
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-lp-inkt" style={{ left: `${pos}%` }} />
        </div>
        <label htmlFor={slider} className="mt-3 block text-sm font-semibold">
          Schuif om voor en na te vergelijken
        </label>
        <input id={slider} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} />
        <MaatH label="voor ← → na" className="mt-1" />
      </div>
    </div>
  );
}
