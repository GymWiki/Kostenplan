"use client";

import { useActionState, useState } from "react";
import { registerAction, type AuthFormState } from "@/app/lib/actions/auth";
import { GoogleSignInButton } from "@/app/components/auth/google-signin-button";
import { Button } from "@/app/components/ui/button";
import { Input, Label, PasswordInput } from "@/app/components/ui/input";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    null
  );
  // Los bijgehouden (niet defaultValue): React reset uncontrolled velden na
  // elke form action, ook bij een fout. Zonder deze eigen state raakt de
  // gebruiker bij bijv. een te zwak wachtwoord ook het al correct ingevulde
  // e-mailadres kwijt en moet alles opnieuw intypen.
  const [email, setEmail] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        of
        <div className="h-px flex-1 bg-border" />
      </div>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {state?.fieldErrors?.email && (
            <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Wachtwoord</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Minimaal 8 tekens"
            required
          />
          {state?.fieldErrors?.password && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.password}
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Account aanmaken…" : "Gratis account aanmaken"}
        </Button>
      </form>
    </div>
  );
}
