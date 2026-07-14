"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { Label, PasswordInput } from "@/app/components/ui/input";
import { updatePasswordAction, type AccountFormState } from "@/app/lib/actions/account";

export function AccountForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>E-mailadres</Label>
        <p className="text-sm text-foreground">{email}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
        <Label htmlFor="password">Nieuw wachtwoord</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="Minimaal 8 tekens"
          minLength={8}
          required
          autoComplete="new-password"
        />
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-accent-foreground">Wachtwoord gewijzigd.</p>
        )}
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Bezig…" : "Wachtwoord wijzigen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
