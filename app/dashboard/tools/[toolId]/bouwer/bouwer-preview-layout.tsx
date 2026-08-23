"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Gedeelde bewerken/preview-layout voor alle drie bouwer-schermen
// (onderdelen-bouwer, calculator-bouwer v1, onderdeel-editor-overlay) — Deel
// 9 van de UI/UX-herontwerpopdracht: op mobiel staan bewerken en preview nu
// niet meer onder elkaar (veel scrollen), maar achter een expliciete
// "← Bewerken / Preview →"-toggle; op desktop blijft de bekende layout
// (twee kolommen naast elkaar) gewoon zichtbaar. De Monitor/Smartphone-
// toggle in het previewpaneel verkleint alleen de breedte van de wrapper
// rond <EngineCalculator> — de engine zelf blijft ongewijzigd.
export function BouwerPreviewLayout({
  bewerken,
  preview,
  previewLabel = "Live voorbeeld — Testmodus",
}: {
  bewerken: React.ReactNode;
  preview: React.ReactNode;
  previewLabel?: string;
}) {
  const [mobielWeergave, setMobielWeergave] = useState<"bewerken" | "preview">("bewerken");
  const [viewport, setViewport] = useState<"desktop" | "mobiel">("desktop");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobielWeergave("bewerken")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            mobielWeergave === "bewerken" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Bewerken
        </button>
        <button
          type="button"
          onClick={() => setMobielWeergave("preview")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            mobielWeergave === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          Preview
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className={cn(mobielWeergave === "preview" && "hidden lg:block")}>{bewerken}</div>

        <div className={cn("lg:sticky lg:top-6 lg:self-start", mobielWeergave === "bewerken" && "hidden lg:block")}>
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
