"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
import {
  createExtraOptionAction,
  updateExtraOptionAction,
  deleteExtraOptionAction,
  toggleExtraOptionActiveAction,
  type ExtraOptionFormState,
} from "@/app/lib/actions/extra-options";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent } from "@/app/components/ui/card";
import { PhotoInput } from "@/app/components/ui/photo-input";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import type { ExtraOption } from "@/app/generated/prisma/client";

export function ExtraOptionsManager({
  productId,
  productEenheid,
  extraOpties,
}: {
  productId: string;
  productEenheid: string;
  extraOpties: ExtraOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-foreground">Extra opties</h2>
        <p className="text-sm text-muted-foreground">
          Optionele toevoegingen die de klant kan aanvinken, bijv. &ldquo;Extra
          sterke scharnieren&rdquo;. Kies of de prijs meetelt met de hoeveelheid
          van dit product (per {unitLabel(productEenheid)}) of dat de klant er zelf een apart
          aantal van opgeeft (per stuk).
        </p>
      </div>

      <NewExtraOptionForm productId={productId} productEenheid={productEenheid} />

      {extraOpties.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Nog geen extra opties. Voeg er hierboven een toe.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {extraOpties.map((option) => (
              <ExtraOptionRow key={option.id} option={option} productEenheid={productEenheid} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ExtraOptionTypeSelect({
  id,
  productEenheid,
  defaultValue,
}: {
  id?: string;
  productEenheid: string;
  defaultValue?: string;
}) {
  return (
    <Select id={id} name="type" defaultValue={defaultValue ?? "PER_EENHEID"}>
      <option value="PER_EENHEID">Per {unitLabel(productEenheid)} (schaalt mee)</option>
      <option value="PER_STUK">Per stuk (apart aantal)</option>
    </Select>
  );
}

function NewExtraOptionForm({
  productId,
  productEenheid,
}: {
  productId: string;
  productEenheid: string;
}) {
  const action = createExtraOptionAction.bind(null, productId);
  const [state, formAction, pending] = useActionState<ExtraOptionFormState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-extra-naam">Naam</Label>
        <Input id="new-extra-naam" name="naam" placeholder="Bijv. Metalen tussenbekleding" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-extra-prijs">Prijs</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput id="new-extra-prijs" name="prijs" placeholder="0" className="pl-7" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-extra-type">Type</Label>
          <ExtraOptionTypeSelect id="new-extra-type" productEenheid={productEenheid} />
        </div>
      </div>
      <input type="hidden" name="actief" value="on" />
      <PhotoInput />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          Toevoegen
        </Button>
      </div>
    </form>
  );
}

function ExtraOptionRow({
  option,
  productEenheid,
}: {
  option: ExtraOption;
  productEenheid: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="p-4">
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await updateExtraOptionAction(option.id, null, formData);
              if (result?.error) {
                setError(result.error);
              } else {
                setEditing(false);
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`naam-${option.id}`}>Naam</Label>
            <Input
              id={`naam-${option.id}`}
              name="naam"
              defaultValue={option.naam}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`prijs-${option.id}`}>Prijs</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
                <DecimalInput
                  id={`prijs-${option.id}`}
                  name="prijs"
                  defaultValue={option.prijs}
                  required
                  className="pl-7"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`type-${option.id}`}>Type</Label>
              <ExtraOptionTypeSelect
                id={`type-${option.id}`}
                productEenheid={productEenheid}
                defaultValue={option.type}
              />
            </div>
          </div>
          <input type="hidden" name="actief" value={String(option.actief)} />
          <Textarea
            name="omschrijving"
            defaultValue={option.omschrijving ?? ""}
            placeholder="Omschrijving (optioneel)"
          />
          <PhotoInput currentUrl={option.foto} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              <X className="h-4 w-4" />
              Annuleren
            </Button>
            <Button type="submit" variant="secondary" disabled={pending}>
              <Check className="h-4 w-4" />
              Opslaan
            </Button>
          </div>
        </form>
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <ActiveMiniToggle extraOptionId={option.id} actief={option.actief} />
        {option.foto && (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
          <img
            src={option.foto}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
          />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{option.naam}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(option.prijs)} /{" "}
            {option.type === "PER_STUK" ? "stuk" : unitLabel(productEenheid)}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Bewerken"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <DeleteExtraOptionForm extraOptionId={option.id} />
      </div>
    </li>
  );
}

function ActiveMiniToggle({
  extraOptionId,
  actief,
}: {
  extraOptionId: string;
  actief: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onChange={(e) => {
        const formData = new FormData(e.currentTarget);
        startTransition(() => toggleExtraOptionActiveAction(formData));
      }}
    >
      <input type="hidden" name="extraOptionId" value={extraOptionId} />
      <input type="hidden" name="actief" value={String(actief)} />
      <Switch defaultChecked={actief} disabled={pending} />
    </form>
  );
}

function DeleteExtraOptionForm({ extraOptionId }: { extraOptionId: string }) {
  return (
    <form
      action={deleteExtraOptionAction}
      onSubmit={(e) => {
        if (!confirm("Weet je zeker dat je deze extra optie wilt verwijderen?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="extraOptionId" value={extraOptionId} />
      <Button type="submit" variant="ghost" size="icon" aria-label="Verwijderen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
