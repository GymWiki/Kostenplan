"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/app/lib/cn";

export type OpslaanStand = "idle" | "wacht" | "bezig" | "opgeslagen" | "fout";
export type OpslaanUitslag = { ok: true; melding?: string } | { ok: false; fout: string };

// Slaat `waarde` automatisch op, ±0,8 s nadat de gebruiker is gestopt met wijzigen. De eerste waarde (bij het laden)
// wordt niet opgeslagen. Een fout blijft staan met "Opnieuw proberen"; een wijziging tijdens het opslaan wordt daarna alsnog bewaard.
export function useAutoSave<T>(waarde: T, opslaan: (w: T) => Promise<OpslaanUitslag>, opties: { aan?: boolean; vertragingMs?: number } = {}) {
  const aan = opties.aan ?? true;
  const [stand, setStand] = useState<OpslaanStand>("idle");
  const [bericht, setBericht] = useState<string | null>(null);
  const laatste = useRef(waarde);
  const eerste = useRef(true);
  const bezig = useRef(false);
  const opnieuwNodig = useRef(false);
  const opslaanRef = useRef(opslaan);
  useEffect(() => {
    opslaanRef.current = opslaan;
  });

  const voerUitRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    voerUitRef.current = async () => {
      if (bezig.current) {
        opnieuwNodig.current = true;
        return;
      }
      bezig.current = true;
      setStand("bezig");
      try {
        const r = await opslaanRef.current(laatste.current);
        if (r.ok) {
          setBericht(r.melding ?? null);
          setStand(opnieuwNodig.current ? "wacht" : "opgeslagen");
        } else {
          setBericht(r.fout);
          setStand("fout");
        }
      } catch {
        setBericht("Opslaan lukt nu niet. Controleer je verbinding.");
        setStand("fout");
      } finally {
        bezig.current = false;
        if (opnieuwNodig.current) {
          opnieuwNodig.current = false;
          void voerUitRef.current();
        }
      }
    };
  });
  const voerUit = () => voerUitRef.current();

  useEffect(() => {
    laatste.current = waarde;
    if (!aan) return;
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    setStand("wacht");
    const t = setTimeout(() => void voerUit(), opties.vertragingMs ?? 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(waarde), aan]);

  // Waarschuw bij het verlaten van de pagina met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (stand !== "wacht" && stand !== "bezig") return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [stand]);

  return { stand, bericht, opnieuw: () => void voerUit() };
}

export function OpslaanStatus({ stand, bericht, opnieuw, className }: { stand: OpslaanStand; bericht: string | null; opnieuw: () => void; className?: string }) {
  const tekst = stand === "wacht" || stand === "bezig" ? "Opslaan…" : stand === "opgeslagen" ? "Opgeslagen" : stand === "fout" ? bericht : null;
  return (
    <p role="status" aria-live="polite" className={cn("min-h-6 text-sm", stand === "fout" ? "font-medium text-destructive" : "text-muted-foreground", className)}>
      {tekst}
      {stand === "opgeslagen" && bericht ? ` · ${bericht}` : ""}
      {stand === "fout" && (
        <button type="button" onClick={opnieuw} className="ml-2 min-h-11 cursor-pointer font-semibold underline">
          Opnieuw proberen
        </button>
      )}
    </p>
  );
}
