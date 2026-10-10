"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { gooiVoorbeeldWegAction, neemVoorbeeldOverAction, type OvernameState } from "@/app/lib/actions/gast-account";

export function OvernameFormulier() {
  const [state, actie, bezig] = useActionState<OvernameState, FormData>(neemVoorbeeldOverAction, null);
  return (
    <div className="flex flex-col gap-3">
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <form action={actie}>
        <Button type="submit" size="lg" className="w-full" disabled={bezig}>
          {bezig ? "Toevoegen…" : "Ja, voeg het voorbeeld toe"}
        </Button>
      </form>
      <form action={gooiVoorbeeldWegAction}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Nee, voorbeeld weggooien
        </Button>
      </form>
    </div>
  );
}
