"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  publiceerOpnieuwAction,
  publicatieStatusAction,
  type PublicatieStatus,
} from "@/app/lib/actions/publicatie";

// Toont of de wijzigingen al bij je klanten staan. Opslaan zelf blokkeert
// hier nooit op: het doorzetten gebeurt op de achtergrond; lukt dat niet, dan
// staat hier "Nog niet gepubliceerd" met een knop om het opnieuw te proberen.
export function PublicatieStatusLabel({
  toolId,
  begin,
  opgeslagenTeller,
}: {
  toolId: string;
  begin: PublicatieStatus;
  // Verandert elke keer dat er is opgeslagen; zet het controleren in gang.
  opgeslagenTeller: number;
}) {
  const [status, setStatus] = useState<PublicatieStatus>(begin);
  const [bezig, setBezig] = useState(false);
  // Hoeveel seconden we al op doorzetten wachten (loopt alleen zolang er iets te publiceren valt).
  const [wachtSeconden, setWachtSeconden] = useState(0);
  const poging = useRef(0);

  const ververs = useCallback(async () => {
    try {
      const nieuw = await publicatieStatusAction(toolId);
      setStatus(nieuw);
      if (!nieuw.vuil) setWachtSeconden(0);
      return nieuw;
    } catch {
      return null;
    }
  }, [toolId]);

  // Na een opslag: even later de stand ophalen, daarna rustig blijven kijken
  // zolang er nog iets te publiceren valt.
  useEffect(() => {
    if (opgeslagenTeller === 0) return;
    poging.current += 1;
    const huidig = poging.current;
    let stop = false;
    (async () => {
      for (const pauze of [2000, 3000, 5000, 8000, 12000]) {
        await new Promise((r) => setTimeout(r, pauze));
        if (stop || huidig !== poging.current) return;
        const s = await ververs();
        if (s && !s.vuil) return;
      }
    })();
    return () => {
      stop = true;
    };
  }, [opgeslagenTeller, ververs]);

  useEffect(() => {
    if (!status.vuil) return;
    const t = setInterval(() => setWachtSeconden((n) => n + 2), 2000);
    return () => clearInterval(t);
  }, [status.vuil]);

  if (!status.actief || !status.vuil) return null;

  if (!status.fout && wachtSeconden < 15) {
    return (
      <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Wijziging wordt doorgezet…
      </span>
    );
  }

  return (
    <span role="status" className="flex flex-wrap items-center gap-2 text-xs font-medium text-warning">
      <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
      Nog niet gepubliceerd
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={bezig}
        onClick={async () => {
          setBezig(true);
          try {
            setStatus(await publiceerOpnieuwAction(toolId));
          } finally {
            setBezig(false);
          }
        }}
      >
        Opnieuw proberen
      </Button>
    </span>
  );
}
