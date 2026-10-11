"use client";

import { useEffect } from "react";

// Laat het laadscript op de site van de hovenier weten dat de rekentool echt
// geladen is (dan blijft de contactkaart weg) en zet de offline-kopie klaar. Faalt stil.
export function EmbedSignaal({ toolId }: { toolId: string }) {
  useEffect(() => {
    try {
      window.parent.postMessage({ type: "kostenplan:klaar", toolId }, "*");
    } catch {
      // geen parent of geblokkeerd: niets aan te doen
    }
    // Bewaar deze rekentool in de browser van de bezoeker, zodat hij er bij een
    // volgend bezoek ook is als onze server even niet bereikbaar is.
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/embed-sw.js", { scope: "/embed/" })
          .then(() => navigator.serviceWorker.ready)
          .then((reg) => {
            const urls = [
              window.location.href,
              ...performance
                .getEntriesByType("resource")
                .map((r) => r.name)
                .filter((u) => u.startsWith(window.location.origin) && u.includes("/_next/static/")),
            ];
            reg.active?.postMessage({ type: "bewaar", urls });
          })
          .catch(() => {});
      }
    } catch {
      // service workers geblokkeerd (privémodus, browserinstelling): dan zonder
    }
  }, [toolId]);
  return null;
}
