"use client";

import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/lib/actions/auth";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bedrijfsnaam">Bedrijfsnaam</Label>
        <Input
          id="bedrijfsnaam"
          name="bedrijfsnaam"
          placeholder="Groenrijk Hoveniers"
          required
        />
        {state?.fieldErrors?.bedrijfsnaam && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.bedrijfsnaam}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jij@hovenier.nl"
          required
        />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          name="password"
          type="password"
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
  );
}
