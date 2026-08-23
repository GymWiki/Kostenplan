"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Rocket } from "lucide-react";
import { valideerCalculatorConfig, type ModulaireCalculatorConfigData } from "@/app/lib/calculator-engine";
import {
  saveCalculatorConfigDraftAction,
  publishCalculatorConfigAction,
  schakelUitCalculatorEngineAction,
} from "@/app/lib/actions/calculator-config";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { cn } from "@/app/lib/cn";
import { OnderdelenTab } from "./onderdelen-tab";
import { ResultaatTab } from "./resultaat-tab";
import type { Branding, SubscriptionTier, OnderdeelBibliotheek } from "@/app/generated/prisma/client";

type Tab = "onderdelen" | "resultaat";

const TABS: { id: Tab; label: string }[] = [
  { id: "onderdelen", label: "Onderdelen" },
  { id: "resultaat", label: "Resultaat" },
];

// Levering B v2 — de modulaire tegenhanger van CalculatorBouwer (blijft
// zelf volledig ongewijzigd voor bestaande versie-1-tools). Zelfde
// chrome/patroon: autosave (debounce, geen aparte "Opslaan"-knop),
// live-validatie, publiceren blokkeert op FOUT-meldingen — alleen de
// hoofdinhoud is de Onderdelen-lijst i.p.v. Vragen/Berekening/Stappen.
export function OnderdelenBouwer({
  toolId,
  toolNaam,
  heeftLiveVersie,
  initieleConfig,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  btwPercentage,
  materiaalOpties: initieleMateriaalOpties,
  initieleOnderdeelBibliotheek,
}: {
  toolId: string;
  toolNaam: string;
  heeftLiveVersie: boolean;
  initieleConfig: ModulaireCalculatorConfigData;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  btwPercentage: number;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  initieleOnderdeelBibliotheek: OnderdeelBibliotheek[];
}) {
  const [config, setConfig] = useState(initieleConfig);
  const [materiaalOpties, setMateriaalOpties] = useState(initieleMateriaalOpties);
  const [onderdeelBibliotheek, setOnderdeelBibliotheek] = useState(initieleOnderdeelBibliotheek);
  const [tab, setTab] = useState<Tab>("onderdelen");
  const [opslaanStatus, setOpslaanStatus] = useState<"idle" | "bezig" | "opgeslagen">("opgeslagen");
  const [gepubliceerd, setGepubliceerd] = useState(heeftLiveVersie);
  const [publiceerFout, setPubliceerFout] = useState<string | null>(null);
  const [publiceren, startPublicerenTransition] = useTransition();
  const [uitschakelenOpen, setUitschakelenOpen] = useState(false);
  const [uitschakelen, startUitschakelenTransition] = useTransition();

  const meldingen = valideerCalculatorConfig(config);
  const fouten = meldingen.filter((m) => m.ernst === "FOUT");
  const waarschuwingen = meldingen.filter((m) => m.ernst === "WAARSCHUWING");

  const eersteRender = useRef(true);
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    setOpslaanStatus("bezig");
    const timer = setTimeout(() => {
      void saveCalculatorConfigDraftAction(toolId, config).then(() => setOpslaanStatus("opgeslagen"));
    }, 700);
    return () => clearTimeout(timer);
  }, [config, toolId]);

  function handlePublish() {
    setPubliceerFout(null);
    startPublicerenTransition(async () => {
      const result = await publishCalculatorConfigAction(toolId);
      if (!result.success) {
        setPubliceerFout(
          `Kan nog niet publiceren: ${result.meldingen.find((m) => m.ernst === "FOUT")?.boodschap ?? "controleer de configuratie"}`
        );
        return;
      }
      setGepubliceerd(true);
    });
  }

  function handleSchakelUit() {
    startUitschakelenTransition(async () => {
      await schakelUitCalculatorEngineAction(toolId);
      setGepubliceerd(false);
      setUitschakelenOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Calculator-bouwer</h1>
            <Badge variant={gepubliceerd ? "success" : "muted"}>{gepubliceerd ? "Live" : "Nog niet gepubliceerd"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Voor &ldquo;{toolNaam}&rdquo;</p>
        </div>
        <div className="flex items-center gap-2">
          {opslaanStatus === "bezig" && <span className="text-xs text-muted-foreground">Opslaan…</span>}
          {opslaanStatus === "opgeslagen" && <span className="text-xs text-muted-foreground">Concept opgeslagen</span>}
        </div>
        <Button type="button" onClick={handlePublish} disabled={publiceren || fouten.length > 0}>
          <Rocket className="h-4 w-4" />
          {publiceren ? "Publiceren…" : gepubliceerd ? "Wijzigingen publiceren" : "Publiceren"}
        </Button>
      </div>

      {publiceerFout && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{publiceerFout}</p>}

      {(fouten.length > 0 || waarschuwingen.length > 0) && (
        <div className="flex flex-col gap-1.5">
          {fouten.map((m, i) => (
            <p key={`fout-${i}`} className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {m.boodschap}
            </p>
          ))}
          {waarschuwingen.map((m, i) => (
            <p key={`waarschuwing-${i}`} className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {m.boodschap}
            </p>
          ))}
        </div>
      )}
      {fouten.length === 0 && waarschuwingen.length === 0 && config.onderdelen.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          Geen problemen gevonden.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <nav className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "onderdelen" && (
            <OnderdelenTab
              toolId={toolId}
              onderdelen={config.onderdelen}
              onChange={(onderdelen) => setConfig((c) => ({ ...c, onderdelen }))}
              materiaalOpties={materiaalOpties}
              onMateriaalOptiesChange={setMateriaalOpties}
              resultaatInstellingen={config.resultaatInstellingen}
              btwPercentage={btwPercentage}
              bedrijfsnaam={bedrijfsnaam}
              email={email}
              subscriptionTier={subscriptionTier}
              branding={branding}
              onderdeelBibliotheek={onderdeelBibliotheek}
              onOnderdeelBibliotheekChange={setOnderdeelBibliotheek}
            />
          )}
          {tab === "resultaat" && (
            <ResultaatTab
              instellingen={config.resultaatInstellingen}
              onChange={(resultaatInstellingen) => setConfig((c) => ({ ...c, resultaatInstellingen }))}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Live voorbeeld — Testmodus</p>
          </div>
          <div className="h-[70vh] overflow-y-auto rounded-xl border border-border">
            <EngineCalculator
              toolId={toolId}
              bedrijfsnaam={bedrijfsnaam}
              email={email}
              subscriptionTier={subscriptionTier}
              branding={branding}
              config={config}
              btwPercentage={btwPercentage}
              materiaalOpties={materiaalOpties}
              previewModus
            />
          </div>
        </div>
      </div>

      {gepubliceerd && (
        <div className="mt-2 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Terug naar de oude rekentool-editor</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Schakelt de publieke rekentool terug naar de vorige, sjabloon-gedreven editor (Producten/Prijzen/enz.). Je
            Onderdelen-configuratie blijft bewaard en kan je later gewoon weer publiceren.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setUitschakelenOpen(true)}>
            Terugschakelen
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={uitschakelenOpen}
        onClose={() => setUitschakelenOpen(false)}
        onConfirm={handleSchakelUit}
        pending={uitschakelen}
        title="Terugschakelen naar de oude editor?"
        description="De publieke rekentool toont hierna weer de sjabloon-gedreven calculator (Producten/Prijzen). Je Onderdelen-configuratie blijft bewaard."
        confirmLabel="Terugschakelen"
        variant="primary"
      />
    </div>
  );
}
