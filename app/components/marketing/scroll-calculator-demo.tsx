"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { DecimalInput, Label } from "@/app/components/ui/input";
import { Reveal } from "@/app/components/ui/reveal";
import { formatCurrency } from "@/app/lib/format";
import { useCountUp } from "@/app/lib/use-count-up";
import { cn } from "@/app/lib/cn";

type VeldKey = "oppervlakte" | "bestrating" | "schutting" | "verlichting";

type DemoState = {
  titel: string;
  tekst: string;
  oppervlakte: number;
  bestrating: number | null;
  schutting: number | null;
  verlichting: boolean;
  prijs: number;
};

// De vier states uit de opdracht (Deel 9) — scroll bepaalt welke actief is,
// geen fragiele pixel-perfecte scrollanimatie. Elke state voegt precies één
// keuze toe t.o.v. de vorige, zodat "welk veld is er net bijgekomen" 1-op-1
// uit de state-index is af te leiden (VELD_PER_STAP hieronder).
const STATES: DemoState[] = [
  {
    titel: "Kies de tuinoppervlakte",
    tekst: "Een bezoeker vult eerst in hoeveel vierkante meter zijn tuin is.",
    oppervlakte: 50,
    bestrating: null,
    schutting: null,
    verlichting: false,
    prijs: 2500,
  },
  {
    titel: "Voeg bestrating toe",
    tekst: "Wil de klant ook bestrating? Dan telt dat automatisch mee in de berekening.",
    oppervlakte: 50,
    bestrating: 20,
    schutting: null,
    verlichting: false,
    prijs: 4850,
  },
  {
    titel: "Voeg een schutting toe",
    tekst: "Ook een schutting is met één keuze aan de berekening toegevoegd.",
    oppervlakte: 50,
    bestrating: 20,
    schutting: 12,
    verlichting: false,
    prijs: 6290,
  },
  {
    titel: "Voeg tuinverlichting toe",
    tekst: "Met tuinverlichting is de berekening compleet — en verschijnt de aanvraagknop.",
    oppervlakte: 50,
    bestrating: 20,
    schutting: 12,
    verlichting: true,
    prijs: 7140,
  },
];

const LEEG_STATE: DemoState = {
  titel: "Nog niets ingevuld",
  tekst: "Zodra de bezoeker begint met invullen, verschijnt hier direct een prijsindicatie.",
  oppervlakte: 0,
  bestrating: null,
  schutting: null,
  verlichting: false,
  prijs: 0,
};

const VELD_PER_STAP: VeldKey[] = ["oppervlakte", "bestrating", "schutting", "verlichting"];

// Scroll-driven productdemo (SEO/GEO-opdracht "interactieve productdemo's",
// Deel 4-9): laat zien hoe een websitebezoeker een Kostenplan-rekentool
// gebruikt — keuze → prijs verandert → volgende keuze → prijs verandert —
// i.p.v. een statische screenshot. Desktop gebruikt het klassieke
// "scrollytelling"-patroon (linkerkolom in normale flow, IntersectionObserver
// bepaalt welke stap actief is; rechterkolom sticky, toont die state) — dat
// is IO-gedreven i.p.v. een scroll-listener, dus geen zware JS per
// scrollpixel (Deel 17, performance). Mobiel herhaalt hetzelfde patroon niet
// (geen sticky kolom past goed op smalle schermen) maar toont staptekst en
// bijbehorende calculator-snapshot afgewisseld (Deel 6/18).
export function ScrollCalculatorDemo() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    for (const el of markerRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const state = activeIndex >= 0 ? STATES[activeIndex] : LEEG_STATE;
  const veldJuistGewijzigd = activeIndex >= 0 ? VELD_PER_STAP[activeIndex] : null;

  // Kort actief na elke statewissel, zodat het net-gewijzigde veld even
  // subtiel highlight (Deel 7: "de gebruiker moet begrijpen dat deze twee
  // gebeurtenissen met elkaar verbonden zijn") — daarna weer uit, dit is
  // geen doorlopende animatie.
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (veldJuistGewijzigd == null) return;
    // setPulse(true) via rAF i.p.v. synchroon in de effect-body — zelfde
    // reden als in use-count-up.ts (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(() => setPulse(true));
    const timeout = setTimeout(() => setPulse(false), 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <section aria-labelledby="productdemo-heading" className="border-y border-border bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Productdemo
          </span>
          <h2 id="productdemo-heading" className="mt-4 text-2xl font-semibold text-balance text-foreground sm:text-3xl">
            Zie hoe het werkt
          </h2>
          <p className="mt-3 text-muted-foreground">
            Scroll mee terwijl een bezoeker zijn tuinproject samenstelt — de prijs berekent live
            mee, precies zoals dat straks op jouw eigen website werkt.
          </p>
        </div>

        {/* Desktop: sticky rechterkolom, IntersectionObserver bepaalt de actieve stap links. */}
        <div className="mt-16 hidden lg:grid lg:grid-cols-2 lg:gap-16">
          <div>
            {STATES.map((s, i) => (
              <div
                key={s.titel}
                ref={(el) => {
                  markerRefs.current[i] = el;
                }}
                data-index={i}
                className={cn(
                  "flex min-h-[70vh] flex-col justify-center gap-3 border-l-2 pl-6 transition-colors duration-300",
                  i === activeIndex ? "border-primary" : "border-border"
                )}
              >
                <span className={cn("text-sm font-semibold", i === activeIndex ? "text-primary" : "text-muted-foreground")}>
                  Stap {i + 1} van {STATES.length}
                </span>
                <h3 className="text-xl font-semibold text-foreground">{s.titel}</h3>
                <p className="text-muted-foreground">{s.tekst}</p>
              </div>
            ))}
          </div>
          <div className="relative">
            <div className="sticky top-24">
              <DemoCalculatorCard
                state={state}
                pulseVeld={pulse ? veldJuistGewijzigd : null}
                showCta={activeIndex === STATES.length - 1}
              />
            </div>
          </div>
        </div>

        {/* Mobiel: staptekst en calculator-snapshot afgewisseld, elk direct in zijn eindstate. */}
        <div className="mt-10 flex flex-col gap-10 lg:hidden">
          {STATES.map((s, i) => (
            <Reveal key={s.titel}>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-sm font-semibold text-primary">
                    Stap {i + 1} van {STATES.length}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{s.titel}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.tekst}</p>
                </div>
                <DemoCalculatorCard state={s} pulseVeld={null} showCta={i === STATES.length - 1} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoCalculatorCard({
  state,
  pulseVeld,
  showCta,
}: {
  state: DemoState;
  pulseVeld: VeldKey | null;
  showCta: boolean;
}) {
  const prijs = useCountUp(state.prijs);

  return (
    <div className="relative mx-auto max-w-sm" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="ml-2 truncate text-xs font-medium text-muted-foreground">groenenzo.nl</span>
        </div>
        <div className="bg-secondary/20 p-4">
          <p className="text-sm font-bold text-foreground">Groen &amp; Zo Tuinen</p>

          <Card className="mt-3 border-primary/15 shadow-md">
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-foreground">Bereken de kosten van jouw tuin</p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-oppervlakte" className="text-xs">
                  Tuinoppervlakte
                </Label>
                <div
                  className={cn(
                    "relative rounded-md transition-shadow duration-300",
                    pulseVeld === "oppervlakte" && "ring-2 ring-primary/50"
                  )}
                >
                  <DecimalInput
                    id="demo-oppervlakte"
                    readOnly
                    tabIndex={-1}
                    value={state.oppervlakte ? String(state.oppervlakte) : ""}
                    placeholder="—"
                    className="h-9 pr-10 text-sm"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    m²
                  </span>
                </div>
              </div>

              <DemoCheckRow
                label="Bestrating"
                waarde={state.bestrating != null ? `${state.bestrating} m²` : null}
                pulse={pulseVeld === "bestrating"}
              />
              <DemoCheckRow
                label="Schutting"
                waarde={state.schutting != null ? `${state.schutting} meter` : null}
                pulse={pulseVeld === "schutting"}
              />
              <DemoSwitchRow label="Tuinverlichting" actief={state.verlichting} pulse={pulseVeld === "verlichting"} />

              <div
                className={cn(
                  "flex flex-col gap-1 rounded-lg bg-primary px-4 py-3 transition-transform duration-300",
                  pulseVeld && "scale-[1.02]"
                )}
              >
                <span className="text-[10px] font-medium tracking-wide text-primary-foreground/75 uppercase">
                  Geschatte kosten
                </span>
                <span className="text-2xl leading-tight font-bold tracking-tight tabular-nums text-primary-foreground">
                  {formatCurrency(prijs)}
                </span>
              </div>

              <div
                className={cn(
                  "grid overflow-hidden transition-all duration-500 ease-out",
                  showCta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0">
                  <span className="flex w-full items-center justify-center rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
                    Ontvang een offerte
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DemoCheckRow({ label, waarde, pulse }: { label: string; waarde: string | null; pulse: boolean }) {
  const actief = waarde != null;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-colors duration-300",
        actief ? "border-primary/40 bg-primary/5" : "border-border bg-card",
        pulse && "ring-2 ring-primary/50"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-300",
          actief ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"
        )}
      >
        {actief && <Check className="h-3 w-3" />}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {waarde && <span className="ml-auto text-xs text-muted-foreground">{waarde}</span>}
    </div>
  );
}

function DemoSwitchRow({ label, actief, pulse }: { label: string; actief: boolean; pulse: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 transition-colors duration-300",
        pulse && "ring-2 ring-primary/50"
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-300",
          actief ? "border-primary bg-primary" : "border-border bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300",
            actief && "translate-x-4"
          )}
        />
      </span>
    </div>
  );
}
