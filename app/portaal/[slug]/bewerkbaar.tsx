"use client";

import { createContext, useContext, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, TriangleAlert } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Haakjes waarmee de rekentool-editor de ECHTE klant-rekentool bewerkbaar
// maakt zonder dat de klant-rekentool zelf iets van de editor hoeft te weten:
// zonder `EditorHaken` renderen alle componenten hieronder gewoon hun kinderen.
// Dezelfde component wordt straks ook gebruikt in de gast-flow (andere sessie,
// zelfde UI): alleen de bron van de gegevens verschilt.
export type Waarschuwing = { soort: "voorbeeld" | "blokkade"; tekst: string };

export type EditorHaken = {
  modus: "bewerken" | "uitproberen";
  geselecteerd: string | null;
  onSelecteer: (doel: string) => void;
  waarschuwingen: Record<string, Waarschuwing>;
  volgorde: string[];
  onVerplaats: (doel: string, richting: -1 | 1) => void;
  onSleep: (van: string, naar: string) => void;
  onToevoegen: () => void;
};

const Ctx = createContext<EditorHaken | null>(null);

export function EditorProvider({ haak, children }: { haak: EditorHaken | undefined; children: React.ReactNode }) {
  return <Ctx.Provider value={haak ?? null}>{children}</Ctx.Provider>;
}

export const useEditorHaak = () => useContext(Ctx);

export function Bewerkbaar({
  doel,
  label,
  verplaatsbaar = false,
  className,
  children,
}: {
  doel: string;
  label: string;
  verplaatsbaar?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const haak = useEditorHaak();
  const [sleeptOver, setSleeptOver] = useState(false);
  if (!haak || haak.modus !== "bewerken") return <>{children}</>;

  const gekozen = haak.geselecteerd === doel;
  const waarschuwing = haak.waarschuwingen[doel];
  const index = haak.volgorde.indexOf(doel);

  return (
    <div
      data-bewerkbaar={doel}
      role="button"
      tabIndex={0}
      aria-label={`${label} aanpassen`}
      aria-pressed={gekozen}
      draggable={verplaatsbaar}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", doel);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!verplaatsbaar) return;
        e.preventDefault();
        setSleeptOver(true);
      }}
      onDragLeave={() => setSleeptOver(false)}
      onDrop={(e) => {
        setSleeptOver(false);
        const van = e.dataTransfer.getData("text/plain");
        if (verplaatsbaar && van && van !== doel) {
          e.preventDefault();
          haak.onSleep(van, doel);
        }
      }}
      onClickCapture={(e) => {
        // Alleen de knoppen van de editor zelf blijven klikbaar.
        const doelEl = e.target as HTMLElement;
        if (doelEl.closest("[data-editor-knop]")) return;
        // Geneste vlakken: het binnenste vlak handelt de klik af.
        if (doelEl.closest("[data-bewerkbaar]") !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
        haak.onSelecteer(doel);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          haak.onSelecteer(doel);
        }
      }}
      className={cn(
        "group/bewerk relative min-w-0 cursor-pointer rounded-lg outline-2 outline-offset-2 transition-[outline-color,box-shadow] focus-visible:outline-blue-600",
        gekozen ? "outline-solid outline-blue-600" : "outline-dashed outline-transparent hover:outline-blue-500/70",
        sleeptOver && "outline-solid outline-blue-600 bg-blue-500/5",
        className
      )}
    >
      <span
        data-editor-knop
        className={cn(
          "pointer-events-none absolute -top-3 left-2 z-20 flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow",
          gekozen ? "opacity-100" : "opacity-0 group-hover/bewerk:opacity-100 group-focus-visible/bewerk:opacity-100"
        )}
      >
        {gekozen ? label : "Klik om aan te passen"}
      </span>
      {waarschuwing && (
        <span
          data-editor-knop
          className={cn(
            "absolute -top-3 right-2 z-20 flex max-w-[70%] items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow",
            waarschuwing.soort === "blokkade" ? "bg-red-600 text-white" : "bg-yellow-300 text-yellow-950"
          )}
          title={waarschuwing.tekst}
        >
          <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{waarschuwing.soort === "blokkade" ? "Nog niet af" : "Voorbeeldprijzen"}</span>
        </span>
      )}
      {verplaatsbaar && (
        <div
          data-editor-knop
          className={cn(
            "absolute -left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center rounded-full border border-border bg-white shadow",
            gekozen ? "opacity-100" : "opacity-0 group-hover/bewerk:opacity-100 group-focus-within/bewerk:opacity-100"
          )}
        >
          <button
            type="button"
            data-editor-knop
            aria-label="Omhoog"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation();
              haak.onVerplaats(doel, -1);
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-800 hover:bg-neutral-100 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <GripVertical className="h-4 w-4 cursor-grab text-neutral-500" aria-hidden="true" />
          <button
            type="button"
            data-editor-knop
            aria-label="Omlaag"
            disabled={index === haak.volgorde.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              haak.onVerplaats(doel, 1);
            }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-800 hover:bg-neutral-100 disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export function WerkzaamheidToevoegen() {
  const haak = useEditorHaak();
  if (!haak || haak.modus !== "bewerken") return null;
  return (
    <button
      type="button"
      onClick={haak.onToevoegen}
      className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-500/60 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      + Werkzaamheid toevoegen
    </button>
  );
}
