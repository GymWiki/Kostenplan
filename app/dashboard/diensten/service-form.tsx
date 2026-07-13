"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import type { ServiceFormState } from "@/app/lib/actions/services";
import { arbeidEenheidEnkelvoud, arbeidEenheidMeervoud } from "@/app/lib/arbeid";
import type { ArbeidStapEenheid, Service } from "@/app/generated/prisma/client";

const eenheden = ["m2", "m1", "m3", "stuks", "uur", "dag"];

export function ServiceForm({
  action,
  service,
  arbeidStapEenheid,
}: {
  action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  service?: Service;
  arbeidStapEenheid: ArbeidStapEenheid;
}) {
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(
    action,
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
        <Label htmlFor="naam">Naam van de dienst</Label>
        <Input
          id="naam"
          name="naam"
          placeholder="Bijv. Terrastegels leggen"
          defaultValue={service?.naam}
          required
        />
        {state?.fieldErrors?.naam && (
          <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="omschrijving">Omschrijving (optioneel)</Label>
        <Textarea
          id="omschrijving"
          name="omschrijving"
          placeholder="Korte toelichting die klanten zien in de calculator"
          defaultValue={service?.omschrijving ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eenheid">Eenheid</Label>
        <Select id="eenheid" name="eenheid" defaultValue={service?.eenheid ?? "m2"}>
          {eenheden.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="arbeidstijd">
            Arbeidstijd per eenheid ({arbeidEenheidMeervoud(arbeidStapEenheid)})
          </Label>
          <Input
            id="arbeidstijd"
            name="arbeidstijd"
            type="number"
            step="0.01"
            min={0}
            defaultValue={service?.arbeidstijd ?? 0}
            required
          />
          <p className="text-xs text-muted-foreground">
            Gebruikt voor arbeidskosten: tijd × tarief per{" "}
            {arbeidEenheidEnkelvoud(arbeidStapEenheid)}.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="materiaalkosten">Materiaalkosten per eenheid</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <Input
              id="materiaalkosten"
              name="materiaalkosten"
              type="number"
              step="0.01"
              min={0}
              className="pl-7"
              defaultValue={service?.materiaalkosten ?? 0}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Materiaal dat nodig is om deze dienst uit te voeren.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icoon</p>
        <IconPicker name="icoon" defaultValue={service?.icoon} />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border p-3">
        <Switch name="actief" defaultChecked={service?.actief ?? true} />
        <div>
          <p className="text-sm font-medium text-foreground">Actief</p>
          <p className="text-sm text-muted-foreground">
            Alleen actieve diensten zijn zichtbaar in het klantenportaal.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <LinkButton href="/dashboard/diensten" variant="outline">
          Annuleren
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Dienst opslaan"}
        </Button>
      </div>
    </form>
  );
}
