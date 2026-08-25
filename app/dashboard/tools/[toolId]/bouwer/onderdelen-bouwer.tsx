"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Puzzle, Redo2, Rocket, Undo2 } from "lucide-react";
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
import { Tabs, type TabItem } from "@/app/components/ui/tabs";
import { useToast } from "@/app/components/ui/toast";
import { BouwerPreviewLayout } from "./bouwer-preview-layout";
import { BuilderThreeColumnLayout } from "./builder-three-column-layout";
import { BuilderTree, type Selectie } from "./builder-tree";
import { VeldSettingsForm } from "./veld-settings-form";
import { RegelSettingsForm } from "./regel-settings-form";
import { OnderdeelSettingsForm } from "./onderdeel-settings-form";
import { ResultaatTab } from "./resultaat-tab";
import { beschikbareVariabelen } from "./variabelen-utils";
import { useConfigHistory } from "./use-config-history";
import type { Branding, SubscriptionTier, OnderdeelBibliotheek } from "@/app/generated/prisma/client";

type Tab = "onderdelen" | "resultaat";

const TABS: TabItem<Tab>[] = [
  { value: "onderdelen", label: "Onderdelen" },
  { value: "resultaat", label: "Resultaat" },
];

// Levering B v2 — de modulaire tegenhanger van CalculatorBouwer (blijft
// zelf volledig ongewijzigd voor bestaande versie-1-tools). Zelfde
// chrome/patroon: autosave (debounce, geen aparte "Opslaan"-knop),
// live-validatie, publiceren blokkeert op FOUT-meldingen.
//
// UX-audit-herontwerp: geen modals meer voor het bewerken van Onderdelen/
// Vragen/Prijsregels — een drie-koloms layout (Componenten | Instellingen |
// Live preview), inline bewerken, undo/redo (Ctrl+Z / Ctrl+Shift+Z). Zie
// builder-tree.tsx (kolom 1), veld-settings-form.tsx/regel-settings-form.tsx/
// onderdeel-settings-form.tsx (kolom 2, per selectietype).
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
  const { config, setConfig, undo, redo, canUndo, canRedo, resetGroepering } = useConfigHistory(initieleConfig);
  const [materiaalOpties, setMateriaalOpties] = useState(initieleMateriaalOpties);
  const [onderdeelBibliotheek, setOnderdeelBibliotheek] = useState(initieleOnderdeelBibliotheek);
  const [tab, setTab] = useState<Tab>("onderdelen");
  // Desktoplayout-professionaliteitsslag: de lege staat in het
  // instellingenpaneel moet de uitzondering zijn (een tool zonder
  // onderdelen), niet het startpunt — bij het openen van de bouwer is
  // meteen het eerste onderdeel (op volgorde) geselecteerd i.p.v. dat de
  // gebruiker eerst zelf iets moet aanklikken.
  const [selectie, setSelectie] = useState<Selectie | null>(() => {
    const eerste = [...initieleConfig.onderdelen].sort((a, b) => a.order - b.order)[0];
    return eerste ? { soort: "onderdeel", onderdeelId: eerste.id } : null;
  });
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [mobielPaneel, setMobielPaneel] = useState<"lijst" | "instellingen" | "preview">("lijst");
  const [opslaanStatus, setOpslaanStatus] = useState<"idle" | "bezig" | "opgeslagen">("opgeslagen");
  const [gepubliceerd, setGepubliceerd] = useState(heeftLiveVersie);
  const [publiceerFout, setPubliceerFout] = useState<string | null>(null);
  const [publiceren, startPublicerenTransition] = useTransition();
  const [uitschakelenOpen, setUitschakelenOpen] = useState(false);
  const [uitschakelen, startUitschakelenTransition] = useTransition();
  const { toast } = useToast();

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
      void saveCalculatorConfigDraftAction(toolId, config)
        .then(() => setOpslaanStatus("opgeslagen"))
        .catch(() => {
          setOpslaanStatus("opgeslagen");
          toast("Opslaan is mislukt — controleer je verbinding en probeer de wijziging opnieuw.", "error");
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [config, toolId, toast]);

  function selecteer(nieuw: Selectie) {
    resetGroepering();
    setSelectie(nieuw);
    setMobielPaneel("instellingen");
  }

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
      toast("Rekentool gepubliceerd — je klanten zien nu de nieuwe versie.", "success");
    });
  }

  function handleSchakelUit() {
    startUitschakelenTransition(async () => {
      await schakelUitCalculatorEngineAction(toolId);
      setGepubliceerd(false);
      setUitschakelenOpen(false);
    });
  }

  const geselecteerdOnderdeel = selectie ? config.onderdelen.find((o) => o.id === selectie.onderdeelId) : undefined;
  const geselecteerdVeld = selectie?.soort === "veld" && geselecteerdOnderdeel ? geselecteerdOnderdeel.velden.find((v) => v.id === selectie.veldId) : undefined;
  const geselecteerdRegel = selectie?.soort === "regel" && geselecteerdOnderdeel ? geselecteerdOnderdeel.regels.find((r) => r.id === selectie.regelId) : undefined;

  function instellingenPaneel() {
    if (!selectie || !geselecteerdOnderdeel) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Puzzle className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            {config.onderdelen.length === 0 ? "Voeg links je eerste onderdeel toe." : "Selecteer links een onderdeel, vraag of prijsregel om te bewerken."}
          </p>
        </div>
      );
    }

    if (selectie.soort === "onderdeel") {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onderdeel</p>
          <OnderdeelSettingsForm
            key={geselecteerdOnderdeel.id}
            toolId={toolId}
            onderdeel={geselecteerdOnderdeel}
            onChange={(nieuw) => setConfig({ ...config, onderdelen: config.onderdelen.map((o) => (o.id === nieuw.id ? nieuw : o)) })}
            onOpgeslagenInBibliotheek={(item) => setOnderdeelBibliotheek([item, ...onderdeelBibliotheek])}
          />
        </div>
      );
    }

    if (selectie.soort === "veld" && geselecteerdVeld) {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vraag · {geselecteerdOnderdeel.naam}</p>
          <VeldSettingsForm
            key={geselecteerdVeld.id}
            toolId={toolId}
            veld={geselecteerdVeld}
            canChangeType={justCreatedId === geselecteerdVeld.id}
            overigeVelden={geselecteerdOnderdeel.velden.filter((v) => v.id !== geselecteerdVeld.id)}
            afgeleideVariabelen={geselecteerdOnderdeel.afgeleideVariabelen}
            materiaalOpties={materiaalOpties}
            onMateriaalOptiesChange={setMateriaalOpties}
            onChange={(nieuw) =>
              setConfig({
                ...config,
                onderdelen: config.onderdelen.map((o) =>
                  o.id === geselecteerdOnderdeel.id ? { ...o, velden: o.velden.map((v) => (v.id === nieuw.id ? nieuw : v)) } : o
                ),
              })
            }
          />
        </div>
      );
    }

    if (selectie.soort === "regel" && geselecteerdRegel) {
      const variabelen = beschikbareVariabelen(geselecteerdOnderdeel.velden, geselecteerdOnderdeel.afgeleideVariabelen);
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prijsregel · {geselecteerdOnderdeel.naam}</p>
          <RegelSettingsForm
            key={geselecteerdRegel.id}
            regel={geselecteerdRegel}
            canChangeType={justCreatedId === geselecteerdRegel.id}
            variabelen={variabelen}
            onChange={(nieuw) =>
              setConfig({
                ...config,
                onderdelen: config.onderdelen.map((o) =>
                  o.id === geselecteerdOnderdeel.id ? { ...o, regels: o.regels.map((r) => (r.id === nieuw.id ? nieuw : r)) } : o
                ),
              })
            }
          />
        </div>
      );
    }

    return null;
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
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <Button type="button" variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Ongedaan maken (Ctrl+Z)" title="Ongedaan maken (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Opnieuw doen (Ctrl+Shift+Z)" title="Opnieuw doen (Ctrl+Shift+Z)">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
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

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "onderdelen" && (
        <BuilderThreeColumnLayout
          mobielPaneel={mobielPaneel}
          onMobielPaneelChange={setMobielPaneel}
          lijst={
            <BuilderTree
              toolId={toolId}
              onderdelen={config.onderdelen}
              onChange={(onderdelen) => setConfig({ ...config, onderdelen })}
              meldingen={meldingen}
              selectie={selectie}
              onSelect={selecteer}
              onderdeelBibliotheek={onderdeelBibliotheek}
              onJustCreated={setJustCreatedId}
            />
          }
          instellingen={instellingenPaneel()}
          preview={
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
          }
        />
      )}

      {tab === "resultaat" && (
        <BouwerPreviewLayout
          bewerken={
            <ResultaatTab
              instellingen={config.resultaatInstellingen}
              onChange={(resultaatInstellingen) => setConfig({ ...config, resultaatInstellingen })}
            />
          }
          preview={
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
          }
        />
      )}

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
