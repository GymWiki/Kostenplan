"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "klaar" | "wijzigingen" | "opslaan" | "fout";

// Debounced autosave (±600 ms) met statusindicator en opnieuw-proberen.
// `waarde` is de volledige formulierstate; `opslaan` krijgt de nieuwste
// waarde en geeft { ok, error } terug. Wijzigingen tijdens het opslaan
// worden na afloop alsnog opgeslagen (nooit twee opslagen tegelijk). Bij
// weggaan met niet-opgeslagen werk waarschuwt de browser.
export function useAutosave<T>(
  waarde: T,
  opslaan: (waarde: T) => Promise<{ ok: true } | { ok: false; error: string }>,
  { vertraging = 600, uitgeschakeld = false }: { vertraging?: number; uitgeschakeld?: boolean } = {}
) {
  const [status, setStatus] = useState<AutosaveStatus>("klaar");
  const [fout, setFout] = useState<string | null>(null);

  const nieuwste = useRef(waarde);
  const laatstOpgeslagen = useRef(waarde);
  const bezig = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opslaanRef = useRef(opslaan);
  useEffect(() => {
    opslaanRef.current = opslaan;
  });

  const draai = useCallback(async () => {
    if (bezig.current) return;
    bezig.current = true;
    setStatus("opslaan");
    setFout(null);
    try {
      while (nieuwste.current !== laatstOpgeslagen.current) {
        const teSlaan = nieuwste.current;
        const resultaat = await opslaanRef.current(teSlaan);
        if (!resultaat.ok) {
          setFout(resultaat.error);
          setStatus("fout");
          return;
        }
        laatstOpgeslagen.current = teSlaan;
      }
      setStatus("klaar");
    } catch {
      setFout("Er ging iets mis met de verbinding.");
      setStatus("fout");
    } finally {
      bezig.current = false;
    }
  }, []);

  useEffect(() => {
    nieuwste.current = waarde;
    if (uitgeschakeld || waarde === laatstOpgeslagen.current) return;
    setStatus((s) => (s === "opslaan" ? s : "wijzigingen"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void draai(), vertraging);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [waarde, vertraging, uitgeschakeld, draai]);

  // Niet-opgeslagen werk: waarschuw bij sluiten/verversen.
  useEffect(() => {
    if (status === "klaar") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const opnieuw = useCallback(() => void draai(), [draai]);

  // Voor ids die de server na opslaan teruggeeft: markeer de nieuwe waarde als
  // al opgeslagen zodat dat geen nieuwe opslag-ronde start.
  const markeerOpgeslagen = useCallback((w: T) => {
    laatstOpgeslagen.current = w;
    nieuwste.current = w;
  }, []);

  return { status, fout, opnieuw, markeerOpgeslagen };
}
