"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/app/lib/cn";

type MobielPaneel = "structuur" | "bewerken" | "preview";

const MOBIEL_LABELS: Record<MobielPaneel, string> = {
  structuur: "Structuur",
  bewerken: "Bewerken",
  preview: "Preview",
};

// Builder-werkruimte (UI/UX-herontwerp): Structuur | Editor | Live preview.
// Editor + Structuur samen ("workspace") ~65-70% van de breedte, preview
// ~30-35% — een permanent zichtbare, sticky preview i.p.v. een on-demand
// paneel, met genoeg gewicht om te voelen als een echt onderdeel van de
// builder in plaats van een bijzaak. Desktop: alle drie naast elkaar, elk
// met een eigen scrollcontainer. Tablet: structuur+editor naast elkaar,
// preview eronder. Mobiel: drie tabs achter een segmented control, nooit
// horizontaal scrollen.
export function BuilderWorkspaceLayout({
  structuur,
  editor,
  preview,
  mobielPaneel,
  onMobielPaneelChange,
  previewLabel = "Live voorbeeld",
}: {
  structuur: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
  mobielPaneel: MobielPaneel;
  onMobielPaneelChange: (paneel: MobielPaneel) => void;
  previewLabel?: string;
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobiel">("desktop");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1 xl:hidden">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[340px_1fr_minmax(320px,34%)]">
        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielPaneel !== "structuur" && "hidden lg:block")}>
          <div className="max-h-[75vh] overflow-y-auto pr-1">{structuur}</div>
        </div>

        <div className={cn(mobielPaneel !== "bewerken" && "hidden lg:block")}>
          <div className="rounded-xl border border-border bg-card p-6">{editor}</div>
        </div>

        <div className={cn("xl:sticky xl:top-6 xl:self-start", mobielPaneel !== "preview" && "hidden xl:block")}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium text-foreground">{previewLabel}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">Testmodus</span>
            </div>
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
          <div className="h-[70vh] overflow-y-auto rounded-xl border border-border bg-secondary/10 p-4">
            <div className={cn("mx-auto", viewport === "mobiel" && "max-w-[390px]")}>{preview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
