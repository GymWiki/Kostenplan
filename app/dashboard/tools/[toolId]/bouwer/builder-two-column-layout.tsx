"use client";

import { cn } from "@/app/lib/cn";

type MobielPaneel = "lijst" | "instellingen";

const MOBIEL_LABELS: Record<MobielPaneel, string> = {
  lijst: "Onderdelen",
  instellingen: "Instellingen",
};

// Twee-koloms bouwer-layout (Componenten | Instellingen) — UI/UX-herontwerp:
// vervangt de eerdere drie-koloms opzet (+ een permanent zichtbare live
// preview) door een rustiger indeling, dichter bij hoe SaaS-formulierbouwers
// (Typeform, Notion) werken: de editor krijgt de volle breedte, en de live
// preview is een on-demand paneel geworden (zie preview-drawer.tsx) i.p.v.
// een derde kolom die altijd ruimte innam. Zelfde grondprincipe als
// bouwer-preview-layout.tsx (desktop: kolommen naast elkaar, mobiel: één
// zichtbare kolom achter een segmented control) — bewust een apart
// component, om v1's CalculatorBouwer op geen enkele manier te raken.
export function BuilderTwoColumnLayout({
  lijst,
  instellingen,
  mobielPaneel,
  onMobielPaneelChange,
}: {
  lijst: React.ReactNode;
  instellingen: React.ReactNode;
  mobielPaneel: MobielPaneel;
  onMobielPaneelChange: (paneel: MobielPaneel) => void;
}) {
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[272px_1fr]">
        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielPaneel !== "lijst" && "hidden lg:block")}>
          <div className="max-h-[75vh] overflow-y-auto pr-1">{lijst}</div>
        </div>

        <div className={cn(mobielPaneel !== "instellingen" && "hidden lg:block")}>
          <div className="max-w-[720px] rounded-xl border border-border bg-card p-6">{instellingen}</div>
        </div>
      </div>
    </div>
  );
}
