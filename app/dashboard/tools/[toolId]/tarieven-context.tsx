"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/cn";
import { Field } from "@/app/components/ui/field";
import { Sheet } from "@/app/components/ui/sheet";
import { UnitInput } from "@/app/components/ui/unit-input";
import { saveTarievenAction } from "@/app/lib/actions/werkzaamheden";
import { arbeidTariefVoorStapEenheid } from "@/app/lib/calculate";
import { STAP_WOORD } from "@/app/lib/werkzaamheid";
import type { CostSettings } from "@/app/generated/prisma/client";

// De tarieven van deze rekentool (al opgelost met de bedrijfsstandaarden),
// gedeeld door het overzicht, de wizard en het bewerkscherm, zodat een
// wijziging via "Mijn tarieven" overal direct doorwerkt in de berekeningen.
type Ctx = {
  toolId: string;
  costSettings: CostSettings;
  tarief: number;
  openTarieven: () => void;
};

const TarievenContext = createContext<Ctx | null>(null);

export function useTarieven() {
  const ctx = useContext(TarievenContext);
  if (!ctx) throw new Error("useTarieven() moet binnen <TarievenProvider> gebruikt worden.");
  return ctx;
}

export function TarievenProvider({
  toolId,
  costSettings: initieel,
  children,
}: {
  toolId: string;
  costSettings: CostSettings;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [costSettings, setCostSettings] = useState(initieel);
  const [open, setOpen] = useState(false);

  const tarief = arbeidTariefVoorStapEenheid(costSettings, costSettings.arbeidStapEenheid);
  const openTarieven = useCallback(() => setOpen(true), []);

  const waarde = useMemo(
    () => ({ toolId, costSettings, tarief, openTarieven }),
    [toolId, costSettings, tarief, openTarieven]
  );

  return (
    <TarievenContext.Provider value={waarde}>
      {children}
      <TarievenSheet
        // Remount bij openen zodat het formulier altijd de actuele waarden toont.
        key={open ? "open" : "dicht"}
        open={open}
        onClose={() => setOpen(false)}
        toolId={toolId}
        costSettings={costSettings}
        tarief={tarief}
        onOpgeslagen={(t) => {
          setCostSettings((c) => ({ ...c, ...t }));
          setOpen(false);
          router.refresh();
        }}
      />
    </TarievenContext.Provider>
  );
}

export function TarievenKnop({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { openTarieven } = useTarieven();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={openTarieven}
      aria-label="Mijn tarieven"
      className={cn("h-11 border-[1.5px] border-input", compact && "w-11 px-0 sm:w-auto sm:px-4", className)}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      <span className={cn(compact && "sr-only sm:not-sr-only")}>Mijn tarieven</span>
    </Button>
  );
}

function TarievenSheet({
  open,
  onClose,
  toolId,
  costSettings,
  tarief,
  onOpgeslagen,
}: {
  open: boolean;
  onClose: () => void;
  toolId: string;
  costSettings: CostSettings;
  tarief: number;
  onOpgeslagen: (t: Partial<CostSettings>) => void;
}) {
  const stap = STAP_WOORD[costSettings.arbeidStapEenheid];
  const [tariefTekst, setTariefTekst] = useState(String(tarief));
  const [voorrij, setVoorrij] = useState(String(costSettings.voorrijTarief));
  const [transport, setTransport] = useState(String(costSettings.transportTarief));
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const r = await saveTarievenAction(toolId, { tarief: tariefTekst, voorrij, transport });
    setBezig(false);
    if (r.ok) {
      const { arbeidTariefUur, arbeidTariefDagdeel, arbeidTariefDag, voorrijTarief, transportTarief } = r.tarieven;
      onOpgeslagen({ arbeidTariefUur, arbeidTariefDagdeel, arbeidTariefDag, voorrijTarief, transportTarief });
    } else {
      setFout(r.error);
    }
  }

  const werk = { dagdeel: "een ochtend of middag", dag: "een dag", uur: "een uur" }[stap.enkelvoud];

  return (
    <Sheet open={open} onClose={onClose} title="Mijn tarieven" description="Eén keer instellen, geldt voor al je onderdelen.">
      <form onSubmit={opslaan} className="flex flex-col gap-4">
        {fout && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {fout}
          </p>
        )}
        <Field
          label={`Tarief per ${stap.enkelvoud}`}
          htmlFor="tarief-arbeid"
          hint={`Wat je de klant rekent voor ${werk} werk, inclusief marge.`}
        >
          <UnitInput id="tarief-arbeid" prefix="€" value={tariefTekst} onChange={(e) => setTariefTekst(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <Field label="Voorrijkosten" htmlFor="tarief-voorrij" hint="Eén keer per klus.">
            <UnitInput id="tarief-voorrij" prefix="€" value={voorrij} onChange={(e) => setVoorrij(e.target.value)} />
          </Field>
          <Field label="Transport" htmlFor="tarief-transport" hint="Eén keer per klus.">
            <UnitInput id="tarief-transport" prefix="€" value={transport} onChange={(e) => setTransport(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" size="lg" disabled={bezig} className="w-full">
          {bezig ? "Opslaan…" : "Opslaan"}
        </Button>
      </form>
    </Sheet>
  );
}
