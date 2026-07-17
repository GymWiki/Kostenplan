"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/lib/actions/auth";
import { GoogleSignInButton } from "@/app/components/auth/google-signin-button";
import { Button } from "@/app/components/ui/button";
import { Input, Label, PasswordInput } from "@/app/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    null
  );

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
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
          {state?.fieldErrors?.password && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.password}
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Bezig met inloggen…" : "Inloggen"}
        </Button>
      </form>
    </div>
  );
}
