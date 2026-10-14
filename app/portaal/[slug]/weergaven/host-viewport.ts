"use client";

import { useEffect, useState } from "react";

// Een rekentool die inline in een iframe op de site van de hovenier staat, is zo hoog als zijn inhoud. "Vast onderin" of
// "volledig scherm" binnen die iframe verwijst dan naar de iframe, niet naar wat de bezoeker ziet. Het laadscript meldt
// daarom welk deel van de iframe in beeld is; vaste balken en vensters plaatsen zich daarnaar.
// Buiten een iframe, of in de pop-up (waar de iframe het hele venster is), blijft dit null en werkt gewoon "fixed".

export type ZichtbaarGebied = { top: number; height: number };

export function useZichtbaarGebied(toolId: string): ZichtbaarGebied | null {
  const [gebied, setGebied] = useState<ZichtbaarGebied | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || window.self === window.top) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      const m = e.data;
      if (!m || typeof m !== "object" || m.type !== "kostenplan:zichtbaar" || m.toolId !== toolId) return;
      if (typeof m.top !== "number" || typeof m.height !== "number" || !Number.isFinite(m.top) || !Number.isFinite(m.height) || m.height <= 0) {
        setGebied(null);
        return;
      }
      setGebied((vorig) => (vorig && vorig.top === m.top && vorig.height === m.height ? vorig : { top: Math.max(0, m.top), height: m.height }));
    }
    window.addEventListener("message", onMessage);
    // Vraag het laadscript om de huidige stand (het kan al eerder zijn verstuurd).
    window.parent.postMessage({ type: "kostenplan:vraag-zichtbaar", toolId }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [toolId]);
  return gebied;
}

// Is het scherm smal (telefoon)? Server en eerste render: breed, daarna de echte waarde.
export function useSmalScherm(maxPx = 639): boolean {
  const [smal, setSmal] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`);
    const zet = () => setSmal(mq.matches);
    zet();
    mq.addEventListener("change", zet);
    return () => mq.removeEventListener("change", zet);
  }, [maxPx]);
  return smal;
}
