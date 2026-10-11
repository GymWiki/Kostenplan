"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

// Valt zowel de snapshot als de database weg, dan toont de iframe een
// neutrale melding en laat het laadscript op de website de contactkaart zien.
export default function EmbedFout() {
  const { toolId } = useParams<{ toolId: string }>();
  useEffect(() => {
    try {
      window.parent.postMessage({ type: "kostenplan:fout", toolId }, "*");
    } catch {
      // geen parent: niets te melden
    }
  }, [toolId]);
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-background px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Deze rekentool is tijdelijk niet beschikbaar</p>
      <p className="text-xs text-muted-foreground">Probeer het later nog eens.</p>
    </div>
  );
}
