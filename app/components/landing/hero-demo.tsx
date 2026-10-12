"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MaatH, MaatV } from "@/app/components/landing/maat";
import { KostenOpbouwKaart } from "@/app/dashboard/tools/[toolId]/producten/editor/kosten-opbouw-kaart";
import { berekenKostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import { bouwDemoDraft, demoToestand, STIJLEN } from "@/app/lib/landing/demo-data";
import { draftNaarKosten, draftNaarProducten } from "@/app/lib/draft-editor";
import { parseGetal } from "@/app/lib/sjablonen";
import { presetById } from "@/app/lib/presets";
import { cn } from "@/app/lib/cn";
import type { Draft } from "@/app/lib/draft";
import type { NaarVoorbeeld, VanVoorbeeld } from "@/app/voorbeeld/[toolId]/voorbeeld-client";
import type { PreviewProduct } from "@/app/lib/werkzaamheid";

const STIJL = STIJLEN.groenhof;
const DEMO_SRC = "/demo/rekentool/groenhof";
const DEMO_TITEL = "Voorbeeld van een rekentool op de website van Groenhof Tuinen, een fictief hoveniersbedrijf";
const geenAbonnement = () => () => {};
const veld =
  "h-11 w-full min-w-0 rounded-xl border border-lp-rand bg-lp-wit px-2.5 text-base tabular-nums text-lp-inkt text-right";

function wijzigDraft(d: Draft, fn: (c: Draft) => void): Draft {
  const kopie = structuredClone(d);
  fn(kopie);
  return kopie;
}

// De hero: de ECHTE klant-rekentool (in een iframe, dus met echte
// breakpoints en server-rendered ingevuld) in de huisstijl van een fictief
// bedrijf, plus een lichte beheerweergave. Prijzen aanpassen bij "Wat jij
// instelt" rekent direct door in de rekentool.
export function HeroDemo() {
  const js = useSyncExternalStore(geenAbonnement, () => true, () => false);
  const [draft, setDraft] = useState(() => bouwDemoDraft(STIJL));
  const [kant, setKant] = useState<"klant" | "beheer">("klant");
  const [actief, setActief] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const klaar = useRef(false);
  // De rekentool in het iframe is zwaar (eigen JavaScript). Met JavaScript laden we
  // hem pas als de pagina klaar is, zodat de kop en de knoppen eerst snel staan;
  // zonder JavaScript staat hetzelfde iframe in <noscript> (server-rendered, ingevuld).
  const [bron, setBron] = useState<string | null>(null);
  useEffect(() => {
    const laad = () => {
      const ri = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
      if (ri) ri(() => setBron(DEMO_SRC), { timeout: 1500 });
      else window.setTimeout(() => setBron(DEMO_SRC), 300);
    };
    if (document.readyState === "complete") laad();
    else {
      window.addEventListener("load", laad, { once: true });
      return () => window.removeEventListener("load", laad);
    }
  }, []);

  const stuur = useCallback((d: Draft) => {
    if (!klaar.current) return;
    const bericht: NaarVoorbeeld = { type: "kp:state", ...demoToestand(d, STIJL) };
    frame.current?.contentWindow?.postMessage(bericht, window.location.origin);
  }, []);

  useEffect(() => {
    function ontvang(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as VanVoorbeeld)?.type === "kp:ready") {
        klaar.current = true;
        stuur(draft);
      }
    }
    window.addEventListener("message", ontvang);
    return () => window.removeEventListener("message", ontvang);
  }, [draft, stuur]);

  const wijzig = (fn: (c: Draft) => void) => {
    setDraft((d) => {
      const nieuw = wijzigDraft(d, fn);
      stuur(nieuw);
      return nieuw;
    });
  };

  const producten = useMemo(() => draftNaarProducten(draft), [draft]);
  const kosten = useMemo(() => draftNaarKosten(draft), [draft]);
  const w = draft.calculator.werkzaamheden[actief];
  const preset = w.presetId ? presetById(w.presetId) : undefined;
  const eenheid = preset?.eenheid ?? "m2";
  const opbouw = useMemo(
    () => berekenKostenOpbouw({ product: producten[actief] as unknown as PreviewProduct, optieId: null, hoeveelheid: preset?.voorbeeldHoeveelheid ?? 20, costSettings: kosten }),
    [producten, actief, preset, kosten]
  );

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
      <div />
      <MaatH label="jouw website" />
      <MaatV label="jouw rekentool" className="hidden min-h-[30rem] sm:flex" />
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <div className={cn("mb-3 flex items-center justify-between gap-3", !js && "invisible")} aria-hidden={!js}>
          <div role="group" aria-label="Kijk mee vanuit" className="inline-flex gap-1 rounded-full border border-lp-lijn bg-lp-wit p-1">
            {(
              [
                ["klant", "Wat je klant ziet"],
                ["beheer", "Wat jij instelt"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kant === k}
                tabIndex={js ? 0 : -1}
                onClick={() => setKant(k)}
                className={cn("min-h-10 cursor-pointer rounded-full px-3 text-sm font-semibold transition-colors sm:px-4", kant === k ? "bg-lp-bos-800 text-white" : "bg-transparent text-lp-inkt hover:bg-lp-papier-2")}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="hidden font-lp-maat text-[11px] tracking-wide text-lp-inkt-2 sm:inline">Voorbeeld · fictief bedrijf</span>
        </div>

        <div className="lp-zacht-groot relative h-[620px] overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit">
          {bron ? (
            <iframe ref={frame} src={bron} title={DEMO_TITEL} className={cn("h-full w-full border-0", kant === "beheer" && "invisible")} />
          ) : (
            <>
              <noscript>
                <style>{".lp-wacht{display:none!important}"}</style>
                <iframe src={DEMO_SRC} title={DEMO_TITEL} className="absolute inset-0 h-full w-full border-0" />
              </noscript>
              <div aria-hidden="true" className="lp-wacht flex h-full items-center justify-center bg-lp-wit font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">
                Rekentool wordt geladen…
              </div>
            </>
          )}
          {kant === "beheer" && (
            <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-lp-staal p-4 sm:p-5">
              <p className="font-lp-maat text-[11px] tracking-wide text-lp-inkt-2">Zo stel jij het in · alleen zichtbaar voor jou</p>
              <div role="group" aria-label="Onderdeel" className="mt-3 flex flex-wrap gap-2">
                {draft.calculator.werkzaamheden.map((x, i) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={actief === i}
                    onClick={() => setActief(i)}
                    className={cn("min-h-11 cursor-pointer rounded-xl border border-lp-lijn px-3 text-sm font-semibold", actief === i ? "bg-lp-inkt text-lp-papier" : "bg-lp-wit text-lp-inkt hover:bg-lp-papier-2")}
                  >
                    {x.draft.naam}
                  </button>
                ))}
              </div>

              <h3 className="mt-5 text-base font-semibold">Materialen en prijzen</h3>
              <ul className="mt-2 divide-y divide-lp-lijn border-y border-lp-lijn">
                {w.draft.materialen.map((m, j) => (
                  <li key={m.sleutel} className="flex items-center gap-3 py-2">
                    <label htmlFor={`prijs-${actief}-${j}`} className="min-w-0 flex-1 text-sm">
                      {m.naam}
                      <span className="block font-lp-maat text-[11px] text-lp-inkt-2">prijs per {eenheid === "m1" ? "meter" : eenheid === "m2" ? "m²" : "stuk"}</span>
                    </label>
                    <span className="text-sm text-lp-inkt-2">€</span>
                    <input
                      id={`prijs-${actief}-${j}`}
                      inputMode="decimal"
                      className={cn(veld, "w-24")}
                      value={m.prijs}
                      onChange={(e) => wijzig((c) => (c.calculator.werkzaamheden[actief].draft.materialen[j].prijs = e.target.value.replace(/[^0-9.,]/g, "")))}
                    />
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 text-base font-semibold">Werktempo en tarieven</h3>
              <div className="mt-2 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Hoeveel {eenheid === "m1" ? "meter" : eenheid === "m2" ? "m²" : "stuks"} {w.draft.naam.toLowerCase()} in een dagdeel?
                  <input
                    inputMode="decimal"
                    className={veld}
                    value={w.draft.productiviteit}
                    onChange={(e) => wijzig((c) => (c.calculator.werkzaamheden[actief].draft.productiviteit = e.target.value.replace(/[^0-9.,]/g, "")))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Tarief per dagdeel (€)
                  <input
                    inputMode="decimal"
                    className={veld}
                    value={String(draft.tarieven.tarief)}
                    onChange={(e) => wijzig((c) => (c.tarieven.tarief = Math.min(10000, Math.max(0, parseGetal(e.target.value, 0)))))}
                  />
                </label>
              </div>

              <KostenOpbouwKaart className="mt-5 rounded-3xl" opbouw={opbouw} eenheid={eenheid} stap="DAGDEEL" />
              <p className="mt-3 text-sm text-lp-inkt-2">Ga terug naar “Wat je klant ziet”: de prijs in de rekentool is meegerekend. Voorbeeldprijzen, pas ze aan naar de jouwe.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
