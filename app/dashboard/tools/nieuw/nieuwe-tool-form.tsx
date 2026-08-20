"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { IconPicker } from "@/app/components/ui/icon-picker";
import { createToolAction, type ToolFormState } from "@/app/lib/actions/tools";

export function NieuweToolForm() {
  const [state, formAction, pending] = useActionState<ToolFormState, FormData>(
    createToolAction,
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
        <Label htmlFor="naam">Naam van de rekentool</Label>
        <Input
          id="naam"
          name="naam"
          placeholder="Bijv. Schuttingen & Erfafscheidingen"
          required
          autoFocus
        />
        {state?.fieldErrors?.naam && (
          <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Icoon</Label>
        <IconPicker name="icoon" />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <LinkButton href="/dashboard/tools" variant="outline">
          Annuleren
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Aanmaken…" : "Rekentool aanmaken"}
        </Button>
      </div>
    </form>
  );
}
