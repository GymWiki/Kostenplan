"use client";

import { useState, useTransition } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { Textarea } from "@/app/components/ui/input";
import { omzettenNaarOfferteAction, markExternAfgehandeldAction } from "@/app/lib/actions/offertes";

type Stap = "keuze" | "notitie";

// Deel 1 van de offerte-afhandelingsflow: twee bewust gelijkwaardige opties
// (zelfde grootte, zelfde stijl, geen primaire/secundaire knopvariant, geen
// vooraf gemarkeerde keuze) — een bewuste correctie op wat een interface
// normaal zou doen. Ook bruikbaar om ná het eerste moment alsnog te wisselen
// naar "ik verstuur zelf" (zie de secundaire knop in lead-detail-drawer.tsx),
// vandaar de startStap/waarschuwing-props om direct bij de notitiestap te
// beginnen.
export function AfhandelKeuzeModal({
  open,
  onClose,
  leadId,
  startStap = "keuze",
  waarschuwing,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  startStap?: Stap;
  waarschuwing?: string;
}) {
  const [stap, setStap] = useState<Stap>(startStap);
  const [notitie, setNotitie] = useState("");
  const [pending, startTransition] = useTransition();

  // Reset naar de gevraagde startstap zodra de modal (opnieuw) opengaat —
  // tijdens render bijgesteld (React's aanbevolen patroon voor "state
  // resetten als een prop verandert"), geen effect nodig.
  const [vorigOpen, setVorigOpen] = useState(open);
  if (open !== vorigOpen) {
    setVorigOpen(open);
    if (open) {
      setStap(startStap);
      setNotitie("");
    }
  }

  function kiesKostenplan() {
    startTransition(() => omzettenNaarOfferteAction(leadId));
  }

  function bevestigExtern() {
    startTransition(async () => {
      await markExternAfgehandeldAction(leadId, notitie);
      onClose();
    });
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      ariaLabelledBy="afhandel-keuze-titel"
      className="flex items-center justify-center p-4"
    >
      <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-lg">
        {stap === "keuze" ? (
          <>
            <h2 id="afhandel-keuze-titel" className="text-lg font-semibold text-foreground">
              Hoe wil je deze aanvraag afhandelen?
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={kiesKostenplan}
                disabled={pending}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">Offerte maken in Kostenplan</span>
                <span className="text-xs text-muted-foreground">
                  Regels, PDF, verzenden en opvolgen — inclusief bewerken/intrekken en de verzend-controles.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStap("notitie")}
                disabled={pending}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
                  <ExternalLink className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">Ik verstuur zelf een offerte</span>
                <span className="text-xs text-muted-foreground">
                  Je maakt en verstuurt de offerte buiten Kostenplan om. Markeer de aanvraag als afgehandeld.
                </span>
              </button>
            </div>
            {pending && <p className="text-xs text-muted-foreground">Bezig…</p>}
          </>
        ) : (
          <>
            <h2 id="afhandel-keuze-titel" className="text-lg font-semibold text-foreground">
              Aanvraag als extern afgehandeld markeren
            </h2>
            {waarschuwing && (
              <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">{waarschuwing}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="externNotitieVeld" className="text-sm text-muted-foreground">
                Notitie (optioneel)
              </label>
              <Textarea
                id="externNotitieVeld"
                value={notitie}
                onChange={(e) => setNotitie(e.target.value)}
                rows={3}
                placeholder="Bijv. offerte per e-mail verstuurd op …"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                size="lg"
                className="w-full sm:flex-1"
                disabled={pending}
                onClick={bevestigExtern}
              >
                {pending ? "Bezig…" : "Markeren als afgehandeld"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full sm:flex-1"
                disabled={pending}
                onClick={startStap === "keuze" ? () => setStap("keuze") : onClose}
              >
                {startStap === "keuze" ? "Terug" : "Annuleren"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
