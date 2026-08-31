"use client";

import { useEffect, useRef, useState } from "react";

// Vloeiend van de vorige naar de nieuwe waarde tellen (SEO/GEO-opdracht
// "interactieve productdemo's", Deel 8: "geen harde sprongen"). Respecteert
// prefers-reduced-motion door direct naar de eindwaarde te springen — de
// informatie (het bedrag) verandert dan nog steeds, alleen zonder de
// telanimatie. Animeert bewust niet op de allereerste render (from === to),
// zodat een prijs bij binnenkomst niet als eerste indruk vanaf 0 optelt.
export function useCountUp(target: number, durationMs = 550) {
  const [waarde, setWaarde] = useState(target);
  const frame = useRef<number | null>(null);
  const vorige = useRef(target);

  useEffect(() => {
    const van = vorige.current;
    const naar = target;
    vorige.current = target;
    if (van === naar) return;

    // Zowel de "spring direct naar het eindgetal" (reduced motion) als de
    // getelde overgang lopen door dezelfde rAF-tick, zodat setState altijd
    // binnen die callback gebeurt — nooit synchroon als eerste statement in
    // de effect-body (react-hooks/set-state-in-effect).
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duur = reduceMotion ? 0 : durationMs;
    const start = performance.now();
    function tick(now: number) {
      const t = duur === 0 ? 1 : Math.min(1, (now - start) / duur);
      const eased = 1 - Math.pow(1 - t, 3);
      setWaarde(Math.round(van + (naar - van) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return waarde;
}
