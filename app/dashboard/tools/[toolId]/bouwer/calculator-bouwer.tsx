"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Rocket } from "lucide-react";
import {
  publicCalculatorConfig,
  valideerCalculatorConfig,
  type CalculatorConfigData,
} from "@/app/lib/calculator-engine";
import { saveCalculatorConfigDraftAction, publishCalculatorConfigAction } from "@/app/lib/actions/calculator-config";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/cn";
import { VeldenTab } from "./velden-tab";
import { RegelsTab } from "./regels-tab";
import { ResultaatTab } from "./resultaat-tab";
import { StappenTab } from "./stappen-tab";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";

type Tab = "vragen" | "berekening" | "resultaat" | "stappen";

const TABS: { id: Tab; label: string }[] = [
  { id: "vragen", label: "Vragen" },
  { id: "berekening", label: "Berekening" },
  { id: "resultaat", label: "Resultaat" },
  { id: "stappen", label: "Stappen" },
];

export function CalculatorBouwer({
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
}: {
  toolId: string;
  toolNaam: string;
  heeftLiveVersie: boolean;
  initieleConfig: CalculatorConfigData;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  btwPercentage: number;
  materiaalOpties: Record<string, MateriaalOptie[]>;
}) {
  const [config, setConfig] = useState(initieleConfig);
  const [materiaalOpties, setMateriaalOpties] = useState(initieleMateriaalOpties);
  const [tab, setTab] = useState<Tab>("vragen");
  const [opslaanStatus, setOpslaanStatus] = useState<"idle" | "bezig" | "opgeslagen">("opgeslagen");
  const [gepubliceerd, setGepubliceerd] = useState(heeftLiveVersie);
  const [publiceerFout, setPubliceerFout] = useState<string | null>(null);
  const [publiceren, startPublicerenTransition] = useTransition();

  const meldingen = useMemo(() => valideerCalculatorConfig(config), [config]);
  const fouten = meldingen.filter((m) => m.ernst === "FOUT");
  const waarschuwingen = meldingen.filter((m) => m.ernst === "WAARSCHUWING");

  // Autosave (zelfde aanpak als het productbewerkscherm: bij elke wijziging,
  // licht gedebounced) — de builder heeft bewust geen aparte "Opslaan"-knop,
  // alleen "Publiceren" is een expliciete actie (Deel 20).
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

  const previewConfig = useMemo(() => publicCalculatorConfig(config), [config]);

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
      {fouten.length === 0 && waarschuwingen.length === 0 && config.velden.length > 0 && config.regels.length > 0 && (
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

          {tab === "vragen" && (
            <VeldenTab
              toolId={toolId}
              velden={config.velden}
              onChange={(velden) => setConfig((c) => ({ ...c, velden }))}
              materiaalOpties={materiaalOpties}
              onMateriaalOptiesChange={setMateriaalOpties}
            />
          )}
          {tab === "berekening" && (
            <RegelsTab
              velden={config.velden}
              afgeleideVariabelen={config.afgeleideVariabelen}
              regels={config.regels}
              onChange={(regels) => setConfig((c) => ({ ...c, regels }))}
            />
          )}
          {tab === "resultaat" && (
            <ResultaatTab
              instellingen={config.resultaatInstellingen}
              onChange={(resultaatInstellingen) => setConfig((c) => ({ ...c, resultaatInstellingen }))}
            />
          )}
          {tab === "stappen" && (
            <StappenTab velden={config.velden} stappen={config.stappen} onChange={(stappen) => setConfig((c) => ({ ...c, stappen }))} />
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Live voorbeeld</p>
          </div>
          <div className="h-[70vh] overflow-y-auto rounded-xl border border-border">
            <EngineCalculator
              toolId={toolId}
              bedrijfsnaam={bedrijfsnaam}
              email={email}
              subscriptionTier={subscriptionTier}
              branding={branding}
              config={previewConfig}
              btwPercentage={btwPercentage}
              materiaalOpties={materiaalOpties}
              previewModus
            />
          </div>
        </div>
      </div>
    </div>
  );
}
