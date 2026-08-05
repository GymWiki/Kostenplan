"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type RequestPasswordResetState } from "@/app/lib/actions/auth";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";

export function WachtwoordVergetenForm() {
  const [state, formAction, pending] = useActionState<RequestPasswordResetState, FormData>(
    requestPasswordResetAction,
    null
  );

  if (state?.success) {
    return (
      <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
        Staat dit e-mailadres bij ons bekend? Dan hebben we net een link gestuurd om een nieuw
        wachtwoord in te stellen. Check ook je spamfolder.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jij@jouwbedrijf.nl"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Bezig met versturen…" : "Verstuur reset-link"}
      </Button>
    </form>
  );
}
