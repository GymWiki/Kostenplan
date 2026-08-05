"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AccountFormState } from "@/app/lib/actions/account";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Label, PasswordInput } from "@/app/components/ui/input";

export function WachtwoordResettenForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updatePasswordAction,
    null
  );

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Je wachtwoord is gewijzigd. Je bent al ingelogd.
        </p>
        <LinkButton href="/dashboard" className="w-full">
          Naar het dashboard
        </LinkButton>
      </div>
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
        <Label htmlFor="password">Nieuw wachtwoord</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Minimaal 8 tekens"
          minLength={8}
          required
        />
        {/* Blijft zichtbaar terwijl je typt — anders dan een placeholder,
            die verdwijnt zodra je begint. */}
        <p className="text-xs text-muted-foreground">Minimaal 8 tekens.</p>
      </div>
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Bezig met opslaan…" : "Wachtwoord instellen"}
      </Button>
    </form>
  );
}
