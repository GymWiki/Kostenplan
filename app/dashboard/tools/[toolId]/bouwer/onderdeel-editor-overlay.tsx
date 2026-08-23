"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { CalculatorResultSettings, OnderdeelConfig, CalculatorField, PriceRule } from "@/app/lib/calculator-engine";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import { saveOnderdeelBibliotheekAction } from "@/app/lib/actions/onderdelen";
import { Overlay } from "@/app/components/ui/overlay";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { Tabs, type TabItem } from "@/app/components/ui/tabs";
import { Breadcrumbs } from "@/app/components/dashboard/breadcrumbs";
import { BouwerPreviewLayout } from "./bouwer-preview-layout";
import { VeldenTab } from "./velden-tab";
import { RegelsTab } from "./regels-tab";
import type { Branding, OnderdeelBibliotheek, SubscriptionTier } from "@/app/generated/prisma/client";

type SubTab = "vragen" | "berekening";

const SUB_TABS: TabItem<SubTab>[] = [
  { value: "vragen", label: "Vragen" },
  { value: "berekening", label: "Prijsregels" },
];

// Fase 5/9 (Deel 3/9 van de opdracht): de builder voor één Onderdeel —
// hergebruikt VeldenTab/RegelsTab ONGEWIJZIGD, alleen gescoped op de
// velden/regels-slice van dit ene Onderdeel. De live preview synthetiseert
// een wegwerp-"versie 1"-config uit alleen dit Onderdeel + de Tool-brede
// resultaatinstellingen, en rendert 'm via de BESTAANDE <EngineCalculator>
// — geen aparte previewberekeningslogica (Deel 9 van de opdracht).
export function OnderdeelEditorOverlay({
  toolId,
  onderdeel,
  onChange,
  onClose,
  materiaalOpties,
  onMateriaalOptiesChange,
  resultaatInstellingen,
  btwPercentage,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  onOpgeslagenInBibliotheek,
}: {
  toolId: string;
  onderdeel: OnderdeelConfig;
  onChange: (onderdeel: OnderdeelConfig) => void;
  onClose: () => void;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  onMateriaalOptiesChange: (materiaalOpties: Record<string, MateriaalOptie[]>) => void;
  resultaatInstellingen: CalculatorResultSettings;
  btwPercentage: number;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  branding: Branding | null;
  onOpgeslagenInBibliotheek: (item: OnderdeelBibliotheek) => void;
}) {
  const [tab, setTab] = useState<SubTab>("vragen");
  const [naam, setNaam] = useState(onderdeel.naam);
  const [beschrijving, setBeschrijving] = useState(onderdeel.beschrijving ?? "");
  const [opslaanInBibliotheekBezig, setOpslaanInBibliotheekBezig] = useState(false);
  const [opgeslagenInBibliotheek, setOpgeslagenInBibliotheek] = useState(false);

  async function opslaanAlsMijnOnderdeel() {
    setOpslaanInBibliotheekBezig(true);
    const result = await saveOnderdeelBibliotheekAction(toolId, onderdeel.id, {
      naam: onderdeel.naam,
      beschrijving: onderdeel.beschrijving,
    });
    setOpslaanInBibliotheekBezig(false);
    if (result.success) {
      setOpgeslagenInBibliotheek(true);
      onOpgeslagenInBibliotheek(result.item);
    }
  }

  function metVelden(velden: CalculatorField[]) {
    onChange({ ...onderdeel, velden });
  }
  function metRegels(regels: PriceRule[]) {
    onChange({ ...onderdeel, regels });
  }
  function metNaamBeschrijving() {
    onChange({ ...onderdeel, naam: naam.trim() || "Onderdeel", beschrijving: beschrijving.trim() || undefined });
  }

  const previewConfig = {
    versie: 1 as const,
    calculatorType: "CONFIGURATOR" as const,
    velden: onderdeel.velden,
    afgeleideVariabelen: onderdeel.afgeleideVariabelen,
    regels: onderdeel.regels.filter((r) => !r.intern),
    stappen: [],
    resultaatInstellingen,
  };

  return (
    <Overlay open onClose={onClose} ariaLabel="Onderdeel bewerken" className="flex items-stretch justify-center bg-background">
      <div className="flex w-full max-w-6xl flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs items={[{ label: "Onderdelen" }, { label: onderdeel.naam }]} />
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={opslaanAlsMijnOnderdeel} disabled={opslaanInBibliotheekBezig}>
              <Save className="h-4 w-4" />
              {opgeslagenInBibliotheek ? "Opgeslagen als Mijn onderdeel" : "Opslaan als Mijn onderdeel"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Klaar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onderdeel-naam">Naam van dit onderdeel</Label>
            <Input id="onderdeel-naam" value={naam} onChange={(e) => setNaam(e.target.value)} onBlur={metNaamBeschrijving} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onderdeel-beschrijving">Beschrijving (optioneel)</Label>
            <Input
              id="onderdeel-beschrijving"
              value={beschrijving}
              onChange={(e) => setBeschrijving(e.target.value)}
              onBlur={metNaamBeschrijving}
              placeholder="Bijv. Kosten voor het plaatsen van een nieuwe schutting"
            />
          </div>
        </div>

        <BouwerPreviewLayout
          previewLabel="Live voorbeeld van dit onderdeel"
          bewerken={
            <div className="flex flex-col gap-4">
              <Tabs tabs={SUB_TABS} value={tab} onChange={setTab} />

              {tab === "vragen" && (
                <VeldenTab
                  toolId={toolId}
                  velden={onderdeel.velden}
                  onChange={metVelden}
                  materiaalOpties={materiaalOpties}
                  onMateriaalOptiesChange={onMateriaalOptiesChange}
                  afgeleideVariabelen={onderdeel.afgeleideVariabelen}
                />
              )}
              {tab === "berekening" && (
                <RegelsTab
                  velden={onderdeel.velden}
                  afgeleideVariabelen={onderdeel.afgeleideVariabelen}
                  regels={onderdeel.regels}
                  onChange={metRegels}
                />
              )}
            </div>
          }
          preview={
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
          }
        />
      </div>
    </Overlay>
  );
}
