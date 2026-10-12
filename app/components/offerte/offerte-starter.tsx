"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { maakOfferteV2Action } from "@/app/lib/actions/offerte-v2";
import { ontbrekendeVerplichteGegevens, type OfferteGegevensWaarden } from "@/app/lib/offerte/gegevens";
import { OfferteGegevensWizard } from "./gegevens-wizard";

// Eerste stap van "Offerte maken": ontbreken er verplichte gegevens, dan vraagt een
// korte wizard alleen die; daarna wordt de offerte gemaakt en de editor geopend.
export function OfferteStarter({ leadId, gegevens, ontbreekt, kleur }: { leadId: string; gegevens: OfferteGegevensWaarden; ontbreekt: number; kleur: string }) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(ontbreekt > 0);
  const [fout, setFout] = useState<string | null>(null);
  const gestart = useRef(false);
  // De overlay gebruikt document: pas na het laden in de browser tonen.
  const client = useSyncExternalStore(() => () => {}, () => true, () => false);

  const maak = useCallback(async () => {
    setFout(null);
    const r = await maakOfferteV2Action(leadId);
    if (r.ok) router.refresh();
    else if (r.reden === "ontbreekt") setWizardOpen(true);
    else setFout(r.error);
  }, [leadId, router]);

  useEffect(() => {
    if (ontbreekt === 0 && !gestart.current) {
      gestart.current = true;
      void maak();
    }
  }, [ontbreekt, maak]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      {fout ? (
        <>
          <p role="alert" className="text-destructive">{fout}</p>
          <Link href="/dashboard/leads" className="font-semibold underline">Terug naar Leads</Link>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <p className="text-foreground">{wizardOpen ? "Vul eerst de gegevens in voor op je offerte." : "Je offerte wordt klaargezet…"}</p>
        </>
      )}
      <OfferteGegevensWizard
        open={client && wizardOpen}
        start={gegevens}
        kleur={kleur}
        onSluit={() => router.push("/dashboard/leads")}
        onKlaar={(g) => {
          if (ontbrekendeVerplichteGegevens(g).length === 0) {
            setWizardOpen(false);
            void maak();
          }
        }}
      />
    </div>
  );
}
