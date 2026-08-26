"use client";

import { useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { Overlay } from "@/app/components/ui/overlay";
import { Button } from "@/app/components/ui/button";

// Live voorbeeld als uitklapbaar paneel i.p.v. een permanente derde kolom
// (UI/UX-herontwerp: minder druk hoofdscherm, editor krijgt de volle
// breedte). Zelfde rechterdrawer-vormgeving als lead-detail-drawer.tsx, voor
// visuele consistentie met de rest van de app — en dus ook dezelfde,
// inmiddels gefixte Overlay-mechaniek (zie overlay.tsx).
export function PreviewDrawer({
  open,
  onClose,
  label = "Live voorbeeld — Testmodus",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobiel">("desktop");

  if (!open) return null;

  return (
    <Overlay open={open} onClose={onClose} ariaLabel={label}>
      <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-secondary/10 shadow-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
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
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Sluiten">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className={cn("mx-auto", viewport === "mobiel" && "max-w-[390px]")}>{children}</div>
        </div>
      </div>
    </Overlay>
  );
}
