"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";
import { formatCenten } from "@/app/lib/pricing/format";
import type { WeergaveConfig } from "@/app/lib/weergave/config";
import { onderdeelIsGeldig, onderdeelInclCenten } from "@/app/lib/weergave/bedragen";
import type { PricingResult } from "@/app/lib/pricing/engine";
import { Bewerkbaar } from "../bewerkbaar";
import type { ProductWithDetails } from "../calculator";
import { MERKKNOP, OnderdeelIcoon, Vinkje, planSamenvatting, VasteBalk, type Configurator } from "./gedeeld";
import type { ZichtbaarGebied } from "./host-viewport";

type TegelsProps = {
  producten: ProductWithDetails[];
  toegevoegd: string[];
  wc: WeergaveConfig;
  // Wat al in het plan zit (voor bedragen op tegels en in de balk) en met het open onderdeel erbij (voor de live prijs).
  resultaat: PricingResult;
  resultaatLive: PricingResult;
  vanaf: Record<string, number | null>;
  prijsVerborgen: boolean;
  openId: string | null;
  onOpen: (id: string | null) => void;
  onToevoegen: (id: string) => void;
  onVerwijder: (id: string) => void;
  configurator: Configurator;
  smal: boolean;
  portalDoel: HTMLElement | null;
  zichtbaar: ZichtbaarGebied | null;
  totaalCenten: number | null;
  onBekijk: () => void;
  // Bij 1 of 2 onderdelen geen raster: direct de configurators.
  direct: boolean;
};

// Aantal kolommen van het raster, zodat het open paneel onder de rij van zijn tegel kan komen.
function useKolommen(ref: React.RefObject<HTMLElement | null>): number {
  const [kolommen, setKolommen] = useState(2);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const meet = () => setKolommen(Math.max(1, getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length));
    meet();
    const o = new ResizeObserver(meet);
    o.observe(el);
    return () => o.disconnect();
  }, [ref]);
  return kolommen;
}

export function TegelsWeergave(p: TegelsProps) {
  const rasterRef = useRef<HTMLUListElement>(null);
  const kolommen = useKolommen(rasterRef);
  const geopend = p.producten.find((x) => x.id === p.openId) ?? null;
  const geopendIndex = geopend ? p.producten.indexOf(geopend) : -1;
  // Het paneel komt na de laatste tegel van de rij waar de geopende tegel in staat.
  const paneelNa = geopendIndex < 0 ? -1 : Math.min(p.producten.length - 1, Math.floor(geopendIndex / kolommen) * kolommen + kolommen - 1);
  const tegelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const laatsteOpener = useRef<string | null>(null);

  // Sluiten: de focus gaat terug naar de tegel.
  function sluit() {
    const id = p.openId;
    p.onOpen(null);
    if (id) requestAnimationFrame(() => tegelRefs.current[id]?.focus());
  }

  function tegelTekst(product: ProductWithDetails): { tekst: string; toegevoegd: boolean } {
    const toegevoegd = p.toegevoegd.includes(product.id);
    if (toegevoegd) return { tekst: p.prijsVerborgen ? "Toegevoegd" : formatCenten(onderdeelInclCenten(p.resultaat, product.id)), toegevoegd };
    const eigen = p.wc.onderdelen[product.id]?.tegelTekst;
    if (eigen) return { tekst: eigen, toegevoegd };
    const v = p.vanaf[product.id];
    if (v == null || p.prijsVerborgen) return { tekst: "", toegevoegd };
    return { tekst: `vanaf ${formatCenten(v)}`, toegevoegd };
  }

  // Bij 1 of 2 onderdelen: geen raster, de configurators staan meteen onder elkaar met een toevoegknop.
  if (p.direct) {
    return (
      <div className="flex flex-col gap-4">
        {p.producten.map((product) => (
          <Bewerkbaar key={product.id} doel={`werkzaamheid:${product.id}`} label={product.naam} verplaatsbaar>
            <section aria-label={product.naam} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              {p.configurator(product, { prijsVerborgen: p.prijsVerborgen })}
              <PaneelKnoppen {...p} product={product} onSluit={() => {}} direct />
            </section>
          </Bewerkbaar>
        ))}
        <TegelsBalk {...p} />
      </div>
    );
  }

  const paneel = geopend ? (
    <PaneelInhoud {...p} product={geopend} onSluit={sluit} />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-foreground">{p.wc.kop}</h3>
      <ul ref={rasterRef} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {p.producten.flatMap((product, i) => {
          const { tekst, toegevoegd } = tegelTekst(product);
          const open = p.openId === product.id;
          const tegel = (
            <li key={product.id} className="flex">
              <Bewerkbaar doel={`werkzaamheid:${product.id}`} label={product.naam} verplaatsbaar className="flex w-full">
                <button
                  ref={(el) => {
                    tegelRefs.current[product.id] = el;
                  }}
                  type="button"
                  aria-expanded={open}
                  aria-haspopup={p.smal ? "dialog" : undefined}
                  aria-controls={!p.smal && open ? "tegel-paneel" : undefined}
                  onClick={() => {
                    laatsteOpener.current = product.id;
                    p.onOpen(open ? null : product.id);
                  }}
                  className={cn(
                    "relative flex min-h-[8.5rem] w-full cursor-pointer flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4",
                    toegevoegd || open ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-border bg-card hover:border-[var(--brand-primary)]/50 hover:bg-secondary/50"
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-foreground">
                    <OnderdeelIcoon product={product} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 break-words font-semibold text-foreground">{product.naam}</span>
                  {tekst && (
                    <span className="mt-auto flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                      {toegevoegd && <Vinkje />}
                      <span className={cn(toegevoegd && "font-semibold text-foreground")}>{tekst}</span>
                      {toegevoegd && <span className="sr-only"> toegevoegd aan je tuinplan</span>}
                    </span>
                  )}
                  {!tekst && toegevoegd && <Vinkje className="mt-auto" />}
                </button>
              </Bewerkbaar>
            </li>
          );
          if (i !== paneelNa || !paneel || p.smal) return [tegel];
          return [
            tegel,
            <li key="paneel" className="col-span-full">
              {paneel}
            </li>,
          ];
        })}
      </ul>
      {!p.prijsVerborgen && Object.values(p.vanaf).some((v) => v != null) && (
        <p className="text-xs text-muted-foreground">Vanaf-prijzen zijn inclusief btw{p.wc.vanafInclVoorrij ? "" : " en exclusief voorrijkosten"}.</p>
      )}
      {p.smal && geopend && (
        <Overlay open onClose={sluit} ariaLabel={geopend.naam} portalDoel={p.portalDoel} zichtbaarGebied={p.zichtbaar} backdropClassName="bg-black/50">
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90%] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl">
            <PaneelInhoud {...p} product={geopend} onSluit={sluit} inDialoog />
          </div>
        </Overlay>
      )}
      <TegelsBalk {...p} />
    </div>
  );
}

function TegelsBalk(p: TegelsProps) {
  if (p.toegevoegd.length === 0) return null;
  return (
    <>
      {/* Plek houden, zodat de vaste balk niets afdekt. */}
      <div aria-hidden="true" className="h-16" />
      <VasteBalk zichtbaar={p.zichtbaar} label="Jouw tuinplan">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-t border-border bg-card px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] sm:px-6">
          <p aria-live="polite" aria-atomic="true" className="min-w-0 text-sm font-semibold tabular-nums text-foreground">
            {planSamenvatting(p.toegevoegd.length, p.totaalCenten)}
          </p>
          <Button type="button" size="lg" className={cn("shrink-0", MERKKNOP)} onClick={p.onBekijk}>
            Bekijk en vraag aan
          </Button>
        </div>
      </VasteBalk>
    </>
  );
}

function PaneelInhoud(p: TegelsProps & { product: ProductWithDetails; onSluit: () => void; inDialoog?: boolean }) {
  const kop = useRef<HTMLHeadingElement>(null);
  // Desktop: de focus gaat naar het paneel. (In een dialoog regelt de overlay dat zelf.)
  useEffect(() => {
    if (!p.inDialoog) kop.current?.focus();
  }, [p.inDialoog, p.product.id]);
  return (
    <div
      id={p.inDialoog ? undefined : "tegel-paneel"}
      role={p.inDialoog ? undefined : "region"}
      aria-labelledby={`paneel-titel-${p.product.id}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !p.inDialoog) {
          e.stopPropagation();
          p.onSluit();
        }
      }}
      className={cn("flex min-h-0 flex-col", p.inDialoog ? "overflow-y-auto overscroll-contain" : "rounded-xl border-2 border-[var(--brand-primary)]/40 bg-card")}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:px-5">
        <h4 id={`paneel-titel-${p.product.id}`} ref={kop} tabIndex={-1} className="min-w-0 break-words text-base font-semibold text-foreground outline-none">
          {p.product.naam}
        </h4>
        <button type="button" onClick={p.onSluit} aria-label={`${p.product.naam} sluiten`} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-4 pb-4 pt-2 sm:px-5">
        {p.configurator(p.product, { prijsVerborgen: p.prijsVerborgen })}
        <PaneelKnoppen {...p} />
      </div>
    </div>
  );
}

function PaneelKnoppen(p: TegelsProps & { product: ProductWithDetails; onSluit: () => void; direct?: boolean }) {
  const toegevoegd = p.toegevoegd.includes(p.product.id);
  const geldig = onderdeelIsGeldig(p.resultaatLive, p.product.id);
  const eigen = onderdeelInclCenten(p.resultaatLive, p.product.id);
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
      {!p.prijsVerborgen && geldig && (
        <p className="text-sm tabular-nums text-muted-foreground sm:mr-auto">
          Dit onderdeel: <strong className="text-foreground">{formatCenten(eigen)}</strong> incl. btw
        </p>
      )}
      {!geldig && <p className="text-sm text-muted-foreground sm:mr-auto">Vul de hoeveelheid in{p.product.materiaalCategorieen.some((c) => c.verplicht) ? " en kies een materiaal" : ""} om door te gaan.</p>}
      {toegevoegd && (
        <Button type="button" variant="ghost" size="lg" onClick={() => p.onVerwijder(p.product.id)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Verwijderen
        </Button>
      )}
      <Button
        type="button"
        size="lg"
        disabled={!geldig}
        className={MERKKNOP}
        onClick={() => {
          p.onToevoegen(p.product.id);
          if (!p.direct) p.onSluit();
        }}
      >
        {toegevoegd ? "Klaar" : p.wc.toevoegTekst}
      </Button>
    </div>
  );
}

