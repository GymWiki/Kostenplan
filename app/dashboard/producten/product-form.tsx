"use client";

import { useActionState, useState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import type { ProductFormState } from "@/app/lib/actions/products";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import type { ArbeidStapEenheid, Product } from "@/app/generated/prisma/client";

const eenheden = ["m1", "m2", "m3", "stuks"];

export function ProductForm({
  action,
  product,
  arbeidStapEenheid,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: Product;
  arbeidStapEenheid: ArbeidStapEenheid;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    null
  );
  const [eenheid, setEenheid] = useState(product?.eenheid ?? "m1");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="naam">Naam van het product</Label>
        <Input
          id="naam"
          name="naam"
          placeholder="Bijv. Schutting"
          defaultValue={product?.naam}
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
          defaultValue={product?.omschrijving ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eenheid">Eenheid</Label>
        <Select
          id="eenheid"
          name="eenheid"
          value={eenheid}
          onChange={(e) => setEenheid(e.target.value)}
        >
          {eenheden.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          De hoeveelheid die de klant opgeeft, bijv. meters schutting. Materiaalprijzen en extra
          opties worden hiermee vermenigvuldigd.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="arbeidsCapaciteit">
          Aantal {eenheid} per {arbeidEenheidEnkelvoud(arbeidStapEenheid)} (optioneel)
        </Label>
        <Input
          id="arbeidsCapaciteit"
          name="arbeidsCapaciteit"
          type="number"
          step="0.01"
          min={0}
          placeholder="Bijv. 5"
          defaultValue={product?.arbeidsCapaciteit ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Hoeveel {eenheid} jij of je team plaatst per {arbeidEenheidEnkelvoud(arbeidStapEenheid)}.
          Bepaalt de arbeidskosten van dit product. Laat leeg als dit product geen arbeidstijd
          kost.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border p-3">
        <Switch name="actief" defaultChecked={product?.actief ?? true} />
        <div>
          <p className="text-sm font-medium text-foreground">Actief</p>
          <p className="text-sm text-muted-foreground">
            Alleen actieve producten zijn zichtbaar in het klantenportaal.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <LinkButton href="/dashboard/producten" variant="outline">
          Annuleren
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Product opslaan"}
        </Button>
      </div>
    </form>
  );
}
