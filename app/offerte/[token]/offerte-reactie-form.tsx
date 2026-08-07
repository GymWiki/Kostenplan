"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Label, Textarea } from "@/app/components/ui/input";
import { reageerOpOfferteAction, type PubliekeReactieState } from "@/app/lib/actions/offertes";

export function OfferteReactieForm({ deelToken }: { deelToken: string }) {
  const [state, formAction, pending] = useActionState<PubliekeReactieState, FormData>(
    reageerOpOfferteAction.bind(null, deelToken),
    null
  );
  // Beide knoppen delen dezelfde pending-status (één form, één action) — dit
  // onthoudt welke knop is aangeklikt, zodat alleen díe zijn tekst wisselt
  // naar "Bezig…" in plaats van dat beide knoppen ambigu tegelijk reageren.
  const [klik, setKlik] = useState<"GEACCEPTEERD" | "AFGEWEZEN" | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-foreground">Ga je akkoord met deze offerte?</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="opmerking">Opmerking (optioneel)</Label>
        <Textarea id="opmerking" name="opmerking" rows={2} placeholder="Bijv. een vraag of aanpassing" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          name="beslissing"
          value="GEACCEPTEERD"
          size="lg"
          disabled={pending}
          onClick={() => setKlik("GEACCEPTEERD")}
          className="w-full sm:flex-1"
        >
          <Check className="h-4 w-4" />
          {pending && klik === "GEACCEPTEERD" ? "Bezig…" : "Akkoord"}
        </Button>
        <Button
          type="submit"
          name="beslissing"
          value="AFGEWEZEN"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => setKlik("AFGEWEZEN")}
          className="w-full sm:flex-1"
        >
          <X className="h-4 w-4" />
          {pending && klik === "AFGEWEZEN" ? "Bezig…" : "Niet akkoord"}
        </Button>
      </div>
    </form>
  );
}
