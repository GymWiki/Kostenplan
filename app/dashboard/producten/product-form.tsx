"use client";

import { useActionState, useState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";
import type { ProductFormState } from "@/app/lib/actions/products";
import { arbeidEenheidEnkelvoud } from "@/app/lib/arbeid";
import { formatCurrency } from "@/app/lib/format";
import type { ArbeidStapEenheid, Product } from "@/app/generated/prisma/client";

const eenheden = ["m1", "m2", "m3", "stuks"];

export function ProductForm({
  action,
  product,
  arbeidStapEenheid,
  arbeidTarief,
  arbeidTariefPerProduct,
  materiaalMarge,
  materiaalMargePerProduct,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: Product;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTarief: number;
  arbeidTariefPerProduct: boolean;
  materiaalMarge: number;
  materiaalMargePerProduct: boolean;
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

      <OverrideField
        label="Arbeidstarief voor dit product"
        name="arbeidTariefOverride"
        perProductEnabled={arbeidTariefPerProduct}
        defaultOverrideValue={product?.arbeidTariefOverride ?? ""}
        placeholder={`Standaard: ${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}`}
        helperWhenEditable={`Leeg = het standaardtarief van ${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)} uit Kosteninstellingen.`}
        helperWhenFixed={`Alle producten gebruiken het arbeidstarief uit Kosteninstellingen (${formatCurrency(arbeidTarief)} per ${arbeidEenheidEnkelvoud(arbeidStapEenheid)}). Wil je voor dit product een ander tarief? Zet "Tarief per product instelbaar" aan bij Kosteninstellingen.`}
        error={state?.fieldErrors?.arbeidTariefOverride}
      />

      <OverrideField
        label="Opslag op materiaalkosten voor dit product"
        name="materiaalMargeOverride"
        perProductEnabled={materiaalMargePerProduct}
        defaultOverrideValue={product?.materiaalMargeOverride ?? ""}
        placeholder={`Standaard: ${materiaalMarge}%`}
        suffix="%"
        helperWhenEditable={`Leeg = de standaardopslag van ${materiaalMarge}% uit Kosteninstellingen.`}
        helperWhenFixed={`Alle producten gebruiken de opslag uit Kosteninstellingen (${materiaalMarge}%). Wil je voor dit product een andere opslag? Zet "Opslag per product instelbaar" aan bij Kosteninstellingen.`}
        error={state?.fieldErrors?.materiaalMargeOverride}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icoon</p>
        <IconPicker name="icoon" defaultValue={product?.icoon} />
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

function OverrideField({
  label,
  name,
  perProductEnabled,
  defaultOverrideValue,
  placeholder,
  suffix,
  helperWhenEditable,
  helperWhenFixed,
  error,
}: {
  label: string;
  name: string;
  perProductEnabled: boolean;
  defaultOverrideValue: number | string;
  placeholder: string;
  suffix?: string;
  helperWhenEditable: string;
  helperWhenFixed: string;
  error?: string;
}) {
  if (!perProductEnabled) {
    return (
      <>
        <input type="hidden" name={name} value={defaultOverrideValue} />
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {helperWhenFixed}
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label} (optioneel)</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min={0}
          placeholder={placeholder}
          defaultValue={defaultOverrideValue}
          className={suffix ? "pr-10" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{helperWhenEditable}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
