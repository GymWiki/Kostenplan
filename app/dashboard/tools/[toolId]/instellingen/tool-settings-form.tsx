"use client";

import { useActionState } from "react";
import { updateToolAction, type ToolFormState } from "@/app/lib/actions/tools";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { IconPicker } from "@/app/components/ui/icon-picker";
import type { Tool } from "@/app/generated/prisma/client";

export function ToolSettingsForm({ toolId, tool }: { toolId: string; tool: Tool }) {
  const [state, formAction, pending] = useActionState<ToolFormState, FormData>(
    updateToolAction.bind(null, toolId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="naam">Naam</Label>
        <Input id="naam" name="naam" defaultValue={tool.naam} required />
        {state?.fieldErrors?.naam && <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Icoon</Label>
        <IconPicker name="icoon" defaultValue={tool.icoon} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
