"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { createFirstToolAction, type OnboardingToolFormState } from "@/app/lib/actions/onboarding";

export function OnboardingToolForm() {
  const [state, formAction, pending] = useActionState<OnboardingToolFormState, FormData>(
    createFirstToolAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="naam">Naam van je rekentool</Label>
        <Input
          id="naam"
          name="naam"
          placeholder="Bijv. Schuttingen & Erfafscheidingen"
          required
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Dit ziet je klant bovenaan de rekentool. Je kunt dit later altijd nog wijzigen.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Aanmaken…" : "Rekentool aanmaken"}
      </Button>
    </form>
  );
}
