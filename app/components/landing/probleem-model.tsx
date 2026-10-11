"use client";

import { useId, useState } from "react";
import { MaatH } from "@/app/components/landing/maat";

const getal = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 0 });

// Het rekenmodel van "de avond na het werk": alleen de getallen van de
// bezoeker, geen aannames over gemiddelden. De beginwaarden staan er alleen
// om iets te tonen; schuif ze naar jouw situatie.
export function ProbleemModel() {
  const a = useId();
  const b = useId();
  const [aanvragen, setAanvragen] = useState(5);
  const [minuten, setMinuten] = useState(45);
  const uren = (aanvragen * minuten * 52) / 60;
  const werkdagen = uren / 8;

  return (
    <div className="overflow-hidden rounded-xl border-[1.5px] border-lp-inkt bg-lp-wit">
      <div className="flex items-center justify-between border-b-[1.5px] border-lp-inkt bg-lp-inkt px-4 py-2.5 font-lp-maat text-[11px] uppercase tracking-wider text-lp-papier">
        <span>Werkbon · jouw avonden</span>
        <span>Schuif naar jouw cijfers</span>
      </div>
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={a} className="text-base font-semibold">
              Hoeveel prijsaanvragen krijg je per week?
            </label>
            <output htmlFor={a} className="font-lp-display text-2xl font-bold tabular-nums">
              {aanvragen}
            </output>
          </div>
          <input id={a} type="range" min={1} max={30} step={1} value={aanvragen} onChange={(e) => setAanvragen(Number(e.target.value))} />
          <MaatH label="aanvragen per week" className="mt-1" />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={b} className="text-base font-semibold">
              Hoeveel minuten kost één offerte?
            </label>
            <output htmlFor={b} className="font-lp-display text-2xl font-bold tabular-nums">
              {minuten} min
            </output>
          </div>
          <input id={b} type="range" min={5} max={120} step={5} value={minuten} onChange={(e) => setMinuten(Number(e.target.value))} />
          <MaatH label="minuten per offerte" className="mt-1" />
        </div>

        <div className="border-t-[1.5px] border-lp-inkt pt-5" aria-live="polite">
          <p className="font-lp-maat text-[11px] uppercase tracking-wider text-lp-inkt-2">
            {aanvragen} × {minuten} min × 52 weken
          </p>
          <p className="mt-1 font-lp-display text-5xl font-extrabold leading-none tabular-nums sm:text-6xl">
            {getal(uren)} <span className="text-2xl font-bold sm:text-3xl">uur per jaar</span>
          </p>
          <p className="mt-2 text-base text-lp-inkt-2">
            Dat zijn ruim {getal(Math.round(werkdagen))} werkdagen van 8 uur die gaan zitten in prijzen uitrekenen, vóórdat je weet of een klant serieus is.
          </p>
        </div>
      </div>
    </div>
  );
}
