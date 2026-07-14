"use client";

import { useActionState, useState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import type { ServiceFormState } from "@/app/lib/actions/services";
import type { Service, ServicePrijsType } from "@/app/generated/prisma/client";

export function ServiceForm({
  action,
  service,
}: {
  action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  service?: Service;
}) {
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(
    action,
    null
  );
  const [prijsType, setPrijsType] = useState<ServicePrijsType>(
    service?.prijsType ?? "UURTARIEF"
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
        <Label htmlFor="prijsType">Prijsvorm</Label>
        <Select
          id="prijsType"
          name="prijsType"
          value={prijsType}
          onChange={(e) => setPrijsType(e.target.value as ServicePrijsType)}
        >
          <option value="UURTARIEF">Uurtarief × geschat aantal uren</option>
          <option value="VASTE_PRIJS">Vaste projectprijs</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          De klant vinkt deze dienst aan of uit in het klantenportaal — er wordt geen
          hoeveelheid opgevraagd.
        </p>
      </div>

      {prijsType === "UURTARIEF" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="uurtarief">Uurtarief</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
              </span>
              <DecimalInput
                id="uurtarief"
                name="uurtarief"
                className="pl-7"
                defaultValue={service?.uurtarief ?? 0}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="geschatteUren">Geschat aantal uren</Label>
            <DecimalInput
              id="geschatteUren"
              name="geschatteUren"
              defaultValue={service?.geschatteUren ?? 0}
              required
            />
            <p className="text-xs text-muted-foreground">
              Kostprijs = uurtarief × geschatte uren.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vastePrijs">Vaste projectprijs</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput
              id="vastePrijs"
              name="vastePrijs"
              className="pl-7"
              defaultValue={service?.vastePrijs ?? 0}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Eén vast bedrag voor deze dienst, ongeacht de omvang van het project.
          </p>
        </div>
      )}

      {/* De niet-actieve prijsvorm blijft verborgen meegestuurd zodat het
          zod-schema (dat altijd alle drie de velden verwacht) niet klaagt,
          ook al toont de UI er maar één set. */}
      {prijsType === "UURTARIEF" ? (
        <input type="hidden" name="vastePrijs" value={service?.vastePrijs ?? 0} />
      ) : (
        <>
          <input type="hidden" name="uurtarief" value={service?.uurtarief ?? 0} />
          <input type="hidden" name="geschatteUren" value={service?.geschatteUren ?? 0} />
        </>
      )}

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
