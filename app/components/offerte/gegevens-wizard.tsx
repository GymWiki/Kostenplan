"use client";

import { useState } from "react";
import { Overlay } from "@/app/components/ui/overlay";
import { BriefpapierVoorbeeld } from "./briefpapier-voorbeeld";
import { OfferteGegevensFormulier } from "@/app/dashboard/profiel/offertegegevens-formulier";
import { ontbrekendeVerplichteGegevens, type OfferteGegevensWaarden } from "@/app/lib/offerte/gegevens";

// Korte wizard die alleen de ontbrekende verplichte gegevens vraagt, met een
// live voorbeeld van het briefpapier. Verschijnt de eerste keer dat de
// hovenier "Offerte maken" kiest en er iets ontbreekt.
export function OfferteGegevensWizard({
  open,
  start,
  kleur,
  onKlaar,
  onSluit,
}: {
  open: boolean;
  start: OfferteGegevensWaarden;
  kleur?: string;
  onKlaar: (g: OfferteGegevensWaarden) => void;
  onSluit: () => void;
}) {
  const [live, setLive] = useState<OfferteGegevensWaarden>(start);
  const ontbreekt = ontbrekendeVerplichteGegevens(start);
  // Het formulier toont alleen de groepen die ontbreken; adres is één groep.
  const velden = Array.from(new Set(ontbreekt.map((o) => o.veld)));
  const toonGroepen = velden.flatMap((v) => (v === "adres" ? ["adres"] : [v])).concat(velden.includes("handelsnaam") ? ["handelsnaam"] : []);

  return (
    <Overlay open={open} onClose={onSluit} ariaLabelledBy="og-wizard-titel" className="flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 shadow-lg sm:rounded-2xl">
        <div>
          <h2 id="og-wizard-titel" className="text-xl font-bold text-foreground">
            Eerst nog een paar gegevens voor op je offerte
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Dit is verplicht op een offerte en staat op elke offerte die je maakt. Je vult het één keer in.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
          <OfferteGegevensFormulier start={start} alleenVelden={toonGroepen} onWijzig={setLive} onOpgeslagen={onKlaar} opslaanLabel="Opslaan en doorgaan" />
          <div className="hidden md:block">
            <p className="mb-2 text-sm font-semibold text-foreground">Zo komt het op je briefpapier</p>
            <div className="relative">
              <BriefpapierVoorbeeld g={live} kleur={kleur} />
            </div>
          </div>
        </div>
        <button type="button" onClick={onSluit} className="min-h-11 w-fit text-sm font-semibold underline">
          Later invullen
        </button>
      </div>
    </Overlay>
  );
}
