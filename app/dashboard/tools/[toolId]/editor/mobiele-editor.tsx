"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronRight, Globe, Plus, Ruler } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, type DropdownMenuItem } from "@/app/components/ui/dropdown-menu";
import { Switch } from "@/app/components/ui/switch";
import { KopActie, KopInstellen } from "@/app/components/mobile/mobiele-kop";
import { MobieleSheet } from "@/app/components/mobile/mobiele-sheet";
import { SegmentedControl } from "@/app/components/mobile/segmented-control";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { formatCurrency } from "@/app/lib/format";
import {
  bouwPreviewProduct,
  draftVanProduct,
  kortEenheid,
  methodeLabel,
  methodeVanProduct,
  voorbeeldHoeveelheidVoor,
  type ProductMetRelaties,
} from "@/app/lib/werkzaamheid";
import { berekenKostenOpbouw, prijsRange } from "@/app/lib/werkzaamheid-kosten";
import { useTarieven } from "../tarieven-context";
import type { Waarschuwing } from "@/app/portaal/[slug]/bewerkbaar";

export type SnelSoort = "prijzen" | "tempo";

// Korte bedragen voor samenvattingen: €28 of €28,50.
export function bedragKort(n: number) {
  return `€${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}`;
}

// Mobiele weergave van de rekentool-editor (< 768 px): één ding per scherm.
// Bewerken = lijst met werkzaamheden (aan/uit, snel prijzen of werktempo
// aanpassen, tik opent het scherm van die werkzaamheid) plus Uiterlijk,
// Resultaat en Aanvraagformulier; Voorbeeld = de echte klant-rekentool.
// Alle gegevens en acties komen van RekentoolEditor (dezelfde state).
export function MobieleEditor({
  naam,
  toolStatus,
  isAangepast,
  producten,
  waarschuwingen,
  modus,
  setModus,
  paneel,
  setPaneel,
  sluitPaneel,
  paneelInhoud,
  paneelTitel,
  statusNode,
  zetZichtbaar,
  verplaats,
  menu,
  voorbeeld,
  renderWerkzaamheid,
  gast,
  meldingNode,
}: {
  naam: string;
  toolStatus: string;
  isAangepast: boolean;
  producten: ProductMetRelaties[];
  waarschuwingen: Record<string, Waarschuwing>;
  modus: "bewerken" | "uitproberen";
  setModus: (m: "bewerken" | "uitproberen") => void;
  paneel: string;
  setPaneel: (p: string) => void;
  sluitPaneel: () => void;
  paneelInhoud: React.ReactNode;
  paneelTitel: string;
  statusNode: React.ReactNode;
  zetZichtbaar: (id: string, aan: boolean) => void;
  verplaats: (id: string, richting: -1 | 1) => void;
  menu: DropdownMenuItem[];
  voorbeeld: React.ReactNode;
  renderWerkzaamheid: (product: ProductMetRelaties, mobiel: "scherm" | SnelSoort) => React.ReactNode;
  gast: boolean;
  meldingNode?: React.ReactNode;
}) {
  const { costSettings } = useTarieven();
  const [snel, setSnel] = useState<{ id: string; soort: SnelSoort } | null>(null);
  const [volgordeOpen, setVolgordeOpen] = useState(false);
  const [voorbeeldGezien, setVoorbeeldGezien] = useState(modus === "uitproberen");
  const werkId = paneel.startsWith("werkzaamheid:") ? paneel.slice(13) : null;
  const werkProduct = werkId ? producten.find((p) => p.id === werkId) : undefined;
  const snelProduct = snel ? producten.find((p) => p.id === snel.id) : undefined;
  const sheetPanelen = ["uiterlijk", "resultaat", "aanvraag", "website", "account", "toevoegen", "aangepast"];
  const sheetOpen = sheetPanelen.includes(paneel);

  const rijen = useMemo(
    () =>
      producten.map((p) => {
        const preview = bouwPreviewProduct({ toolId: p.toolId, draft: draftVanProduct(p), origineel: p });
        const eenheid = kortEenheid(preview.eenheid);
        const hoeveelheid = voorbeeldHoeveelheidVoor(preview.eenheid);
        const opbouw = berekenKostenOpbouw({ product: preview, optieId: null, hoeveelheid, costSettings });
        const range = prijsRange(preview);
        const aantalMat = p.materiaalCategorieen.flatMap((c) => c.materialen.filter((m) => m.actief)).length;
        const voorbeeldAantal = p.materiaalCategorieen.flatMap((c) => c.materialen.filter((m) => m.actief && m.isVoorbeeld)).length;
        return {
          p,
          eenheid,
          hoeveelheid,
          klantPrijs: opbouw.totaal * (1 + (costSettings.btwPercentage ?? 21) / 100),
          samenvatting: `${methodeLabel(methodeVanProduct(p))} · ${aantalMat} ${aantalMat === 1 ? "materiaal" : "materialen"}${range ? ` · ${bedragKort(range.min)}${range.max !== range.min ? `–${bedragKort(range.max)}` : ""}` : ""}`,
          voorbeeldAantal,
        };
      }),
    [producten, costSettings]
  );

  // Eigen scherm voor één werkzaamheid.
  if (werkProduct) {
    return (
      <>
        <KopInstellen titel={werkProduct.naam} onTerug={sluitPaneel} />
        {renderWerkzaamheid(werkProduct, "scherm")}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <KopInstellen titel={naam} terug="/dashboard/tools" />
      <KopActie>
        <DropdownMenu
          ariaLabel="Meer acties voor deze rekentool"
          items={[{ label: "Volgorde wijzigen", icon: ArrowDownUp, disabled: producten.length < 2, onSelect: () => setVolgordeOpen(true) }, ...menu]}
          className="h-11 w-11"
        />
      </KopActie>

      <SegmentedControl
        label="Weergave"
        waarde={modus}
        onChange={(m) => {
          if (m === "uitproberen") setVoorbeeldGezien(true);
          setModus(m);
        }}
        opties={[
          { waarde: "bewerken", label: "Bewerken" },
          { waarde: "uitproberen", label: "Voorbeeld" },
        ]}
      />
      {meldingNode}

      {modus === "uitproberen" && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Testmodus: er wordt geen aanvraag verstuurd.
        </p>
      )}
      {/* Het voorbeeld blijft na het eerste openen geladen (zo staat het direct klaar). */}
      <div className={modus === "uitproberen" ? "-mx-4 -mb-24 overflow-hidden" : "hidden"} style={modus === "uitproberen" ? { height: "calc(100dvh - 11rem)" } : undefined}>
        {voorbeeldGezien && voorbeeld}
      </div>

      {modus === "bewerken" && (
        <>
          <div aria-live="polite" className="min-h-5 text-sm">
            {statusNode}
          </div>

          {isAangepast && (
            <button
              type="button"
              onClick={() => setPaneel("aangepast")}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-example bg-example/15 px-3 py-2 text-left text-sm font-semibold text-foreground"
            >
              Deze rekentool is op maat gebouwd (Aangepast)
              <span className="underline">Bekijken</span>
            </button>
          )}

          <section aria-labelledby="mk-werk" className="flex flex-col gap-2">
            <h2 id="mk-werk" className="text-base font-bold text-foreground">
              Werkzaamheden
            </h2>
            {rijen.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-base text-foreground">Je hebt nog geen werkzaamheden. Voeg er een toe.</p>}
            <ul className="flex flex-col gap-3">
              {rijen.map(({ p, eenheid, hoeveelheid, klantPrijs, samenvatting, voorbeeldAantal }) => {
                const Icoon = (p.icoon && PRODUCT_ICONS[p.icoon]) || Ruler;
                const blokkade = waarschuwingen[`werkzaamheid:${p.id}`]?.soort === "blokkade";
                return (
                  <li key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setPaneel(`werkzaamheid:${p.id}`)}
                      className="flex min-h-20 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                        <Icoon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-foreground">{p.naam}</span>
                        <span className="block break-words text-sm text-muted-foreground">{samenvatting}</span>
                        <span className="block text-sm text-foreground">
                          {hoeveelheid} {eenheid} kost je klant {formatCurrency(klantPrijs)}
                        </span>
                        {voorbeeldAantal > 0 && (
                          <span className="mt-1 inline-block rounded-full bg-example/25 px-2 py-0.5 text-xs font-semibold text-foreground">
                            {voorbeeldAantal === 1 ? "1 voorbeeldprijs" : `${voorbeeldAantal} voorbeeldprijzen`}
                          </span>
                        )}
                        {blokkade && <span className="block text-sm font-medium text-destructive">Voeg een materiaal toe</span>}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 border-t border-border px-2 pt-1">
                      <button type="button" onClick={() => setSnel({ id: p.id, soort: "prijzen" })} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold text-primary">
                        Prijzen
                      </button>
                      <button type="button" onClick={() => setSnel({ id: p.id, soort: "tempo" })} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold text-primary">
                        Werktempo
                      </button>
                    </div>
                    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-2 border-t border-border px-4 text-sm font-semibold text-foreground">
                      Op je website
                      <Switch checked={p.actief} onChange={(e) => zetZichtbaar(p.id, e.target.checked)} aria-label={`${p.naam} op je website`} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="mk-rest" className="flex flex-col gap-2">
            <h2 id="mk-rest" className="text-base font-bold text-foreground">
              Uiterlijk en formulier
            </h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {[
                ["uiterlijk", "Uiterlijk", "Logo, kleuren en kop"],
                ["resultaat", "Resultaat", "Wat je klant ziet na de berekening"],
                ["aanvraag", "Aanvraagformulier", "Velden en bedanktekst"],
              ].map(([id, titel, uitleg]) => (
                <li key={id} className="border-b border-border last:border-b-0">
                  <button type="button" onClick={() => setPaneel(id)} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-foreground">{titel}</span>
                      <span className="block truncate text-sm text-muted-foreground">{uitleg}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={toolStatus === "GEPUBLICEERD" ? "success" : "muted"}>{toolStatus === "GEPUBLICEERD" ? "Live" : toolStatus === "GEPAUZEERD" ? "Gepauzeerd" : "Concept"}</Badge>
              {toolStatus === "GEPUBLICEERD" ? "Wijzigingen staan meteen live." : "Je rekentool staat nog niet op je website."}
            </p>
          </section>

          <StickyActiebalk>
            <Button type="button" variant="outline" size="lg" className="shrink-0 px-4" aria-label={gast ? "Account maken" : "Zet op mijn website"} onClick={() => setPaneel(gast ? "account" : "website")}>
              <Globe className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={() => setPaneel("toevoegen")}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Werkzaamheid
            </Button>
          </StickyActiebalk>
        </>
      )}

      <MobieleSheet open={sheetOpen && modus === "bewerken"} onClose={sluitPaneel} titel={paneelTitel} beginStand="volledig">
        {paneelInhoud}
      </MobieleSheet>

      <MobieleSheet
        open={Boolean(snelProduct)}
        onClose={() => setSnel(null)}
        titel={snelProduct ? `${snelProduct.naam}: ${snel?.soort === "prijzen" ? "prijzen" : "werktempo"}` : ""}
        beginStand={snel?.soort === "prijzen" ? "volledig" : "half"}
      >
        {snelProduct && snel && renderWerkzaamheid(snelProduct, snel.soort)}
      </MobieleSheet>

      <MobieleSheet open={volgordeOpen} onClose={() => setVolgordeOpen(false)} titel="Volgorde wijzigen">
        <ul className="flex flex-col gap-2">
          {producten.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{p.naam}</span>
              <button type="button" aria-label={`${p.naam} omhoog`} disabled={i === 0} onClick={() => verplaats(p.id, -1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-input disabled:opacity-40">
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" aria-label={`${p.naam} omlaag`} disabled={i === producten.length - 1} onClick={() => verplaats(p.id, 1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-input disabled:opacity-40">
                <ArrowDown className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </MobieleSheet>
    </div>
  );
}
