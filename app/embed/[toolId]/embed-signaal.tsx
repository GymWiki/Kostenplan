"use client";

import { useEffect } from "react";

// Laat het laadscript op de site van de hovenier weten dat de rekentool echt
// geladen is (dan blijft de contactkaart weg). Faalt stil.
export function EmbedSignaal({ toolId }: { toolId: string }) {
  useEffect(() => {
    try {
      window.parent.postMessage({ type: "kostenplan:klaar", toolId }, "*");
    } catch {
      // geen parent of geblokkeerd: niets aan te doen
    }
  }, [toolId]);
  return null;
}
