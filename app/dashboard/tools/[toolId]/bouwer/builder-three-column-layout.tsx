"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/app/lib/cn";

type MobielPaneel = "lijst" | "instellingen" | "preview";

const MOBIEL_LABELS: Record<MobielPaneel, string> = {
  lijst: "Onderdelen",
  instellingen: "Instellingen",
  preview: "Preview",
};

// Drie-koloms bouwer-layout (Componenten | Instellingen | Live preview) —
// vervangt de eerdere twee-koloms BouwerPreviewLayout (bewerken | preview)
// voor de Onderdelen-tab van v2-tools. Zelfde grondprincipe als
// bouwer-preview-layout.tsx (desktop: kolommen naast elkaar en elk met een
// eigen scrollcontainer; mobiel: één zichtbare kolom tegelijk achter een
// segmented control, nu met drie in plaats van twee opties) — bewust een
// apart component i.p.v. BouwerPreviewLayout uit te breiden naar drie sloten,
// om v1's CalculatorBouwer (die BouwerPreviewLayout ongewijzigd blijft
// gebruiken) op geen enkele manier te raken.
export function BuilderThreeColumnLayout({
  lijst,
  instellingen,
  preview,
  mobielPaneel,
  onMobielPaneelChange,
  previewLabel = "Live voorbeeld — Testmodus",
}: {
  lijst: React.ReactNode;
  instellingen: React.ReactNode;
  preview: React.ReactNode;
  mobielPaneel: MobielPaneel;
  onMobielPaneelChange: (paneel: MobielPaneel) => void;
  previewLabel?: string;
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobiel">("desktop");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1 lg:hidden">
        {(Object.keys(MOBIEL_LABELS) as MobielPaneel[]).map((paneel) => (
          <button
            key={paneel}
            type="button"
            onClick={() => onMobielPaneelChange(paneel)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              mobielPaneel === paneel ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {MOBIEL_LABELS[paneel]}
          </button>
        ))}
      </div>

      {/* Desktoplayout-professionaliteitsslag: instellingen kon voorheen niet
          meegroeien (vast 360px) terwijl de preview (1fr) op een brede
          desktop uitgroeide tot ruim voorbij hoe breed de rekentool ooit
          écht bij een klant rendert (die is zelf op max-w-3xl/768px
          begrensd) — vandaar het lege gevoel. Instellingen is nu de enige
          flexibele kolom (minmax(340px,1fr): nooit smaller dan voorheen,
          groeit mee op brede/ultrawide schermen — de kaart erbinnen blijft
          zelf op 640px begrensd, zie hieronder, dus dat wordt bewuste
          binnenmarge, geen uitgerekt formulier). Preview is nu vast (290px)
          i.p.v. 1fr, dus die balloont niet meer mee. Kolombreedtes
          geverifieerd tegen de werkelijke shell-breedte (dashboard-sidebar
          256px + tool-nav 208px) op 1440/1920/2560px — past zonder
          horizontale overflow. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(340px,1fr)_290px]">
        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielPaneel !== "lijst" && "hidden lg:block")}>
          <div className="max-h-[75vh] overflow-y-auto pr-1">{lijst}</div>
        </div>

        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielPaneel !== "instellingen" && "hidden lg:block")}>
          <div className="max-h-[75vh] max-w-[640px] overflow-y-auto rounded-xl border border-border bg-card p-4">{instellingen}</div>
        </div>

        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielPaneel !== "preview" && "hidden lg:block")}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">{previewLabel}</p>
            <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                aria-label="Desktopbreedte"
                aria-pressed={viewport === "desktop"}
                className={cn(
                  "flex h-7 w-7 cursor-pointer items-center justify-center rounded",
                  viewport === "desktop" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobiel")}
                aria-label="Mobiele breedte"
                aria-pressed={viewport === "mobiel"}
                className={cn(
                  "flex h-7 w-7 cursor-pointer items-center justify-center rounded",
                  viewport === "mobiel" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="h-[70vh] overflow-y-auto rounded-xl border border-border bg-secondary/10">
            <div className={cn("mx-auto h-full", viewport === "mobiel" && "max-w-[390px]")}>{preview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
