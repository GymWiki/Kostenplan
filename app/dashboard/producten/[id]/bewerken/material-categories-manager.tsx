"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
import {
  createMaterialCategoryAction,
  updateMaterialCategoryAction,
  deleteMaterialCategoryAction,
  type MaterialCategoryFormState,
} from "@/app/lib/actions/material-categories";
import {
  createMaterialOptionAction,
  updateMaterialOptionAction,
  deleteMaterialOptionAction,
  toggleMaterialOptionActiveAction,
  type MaterialOptionFormState,
} from "@/app/lib/actions/material-options";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Input, Label } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent } from "@/app/components/ui/card";
import { PhotoInput } from "@/app/components/ui/photo-input";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import type { MaterialCategory, MaterialOption } from "@/app/generated/prisma/client";

type CategoryWithMaterials = MaterialCategory & { materialen: MaterialOption[] };

export function MaterialCategoriesManager({
  productId,
  productEenheid,
  categories,
}: {
  productId: string;
  productEenheid: string;
  categories: CategoryWithMaterials[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-foreground">Materiaalcategorieën</h2>
        <p className="text-sm text-muted-foreground">
          Onderdelen van dit product waarvoor de klant één materiaal kiest, bijv.
          &ldquo;Kleur&rdquo; of &ldquo;Materiaalsoort&rdquo;.
        </p>
      </div>

      <NewCategoryForm productId={productId} />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Nog geen materiaalcategorieën. Voeg er hierboven een toe.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} productEenheid={productEenheid} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewCategoryForm({ productId }: { productId: string }) {
  const action = createMaterialCategoryAction.bind(null, productId);
  const [state, formAction, pending] = useActionState<
    MaterialCategoryFormState,
    FormData
  >(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Input name="naam" placeholder="Naam van nieuwe materiaalcategorie" required />
          {state?.error && <p className="mt-1.5 text-sm text-destructive">{state.error}</p>}
        </div>
        <Button type="submit" disabled={pending} className="shrink-0">
          <Plus className="h-4 w-4" />
          Categorie toevoegen
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="verplicht" className="h-4 w-4 rounded border-input accent-primary" />
        Materiaalkeuze verplicht — de klant moet hier een keuze maken voordat een offerte kan
        worden aangevraagd.
      </label>
    </form>
  );
}

function CategoryCard({
  category,
  productEenheid,
}: {
  category: CategoryWithMaterials;
  productEenheid: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleRename(formData: FormData) {
    startTransition(async () => {
      const result = await updateMaterialCategoryAction(category.id, null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {editing ? (
          <div>
            <form action={handleRename} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input name="naam" defaultValue={category.naam} required autoFocus />
                <Button type="submit" variant="secondary" size="icon" disabled={pending} aria-label="Opslaan">
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(false)}
                  aria-label="Annuleren"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="verplicht"
                  defaultChecked={category.verplicht}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Materiaalkeuze verplicht
              </label>
            </form>
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{category.naam}</p>
              {category.verplicht && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Verplicht
                </span>
              )}
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
              <DeleteCategoryForm materialCategoryId={category.id} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {category.materialen.map((material) => (
            <MaterialRow key={material.id} material={material} productEenheid={productEenheid} />
          ))}
          <NewMaterialForm materialCategoryId={category.id} productEenheid={productEenheid} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteCategoryForm({ materialCategoryId }: { materialCategoryId: string }) {
  return (
    <form
      action={deleteMaterialCategoryAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Weet je zeker dat je deze categorie en alle materialen erin wilt verwijderen?"
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="materialCategoryId" value={materialCategoryId} />
      <Button type="submit" variant="ghost" size="icon" aria-label="Verwijderen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}

function MaterialRow({
  material,
  productEenheid,
}: {
  material: MaterialOption;
  productEenheid: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-md border border-border p-3">
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await updateMaterialOptionAction(material.id, null, formData);
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
            <Label htmlFor={`naam-${material.id}`}>Naam</Label>
            <Input
              id={`naam-${material.id}`}
              name="naam"
              defaultValue={material.naam}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`prijs-${material.id}`}>Prijs</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
                <DecimalInput
                  id={`prijs-${material.id}`}
                  name="prijs"
                  defaultValue={material.prijs}
                  required
                  className="pl-7"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`stapgrootte-${material.id}`}>Stapgrootte</Label>
              <div className="relative">
                <DecimalInput
                  id={`stapgrootte-${material.id}`}
                  name="stapgrootte"
                  placeholder="bijv. 1.8"
                  defaultValue={material.stapgrootte ?? ""}
                  className="pr-10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unitLabel(productEenheid)}
                </span>
              </div>
            </div>
          </div>
          <input type="hidden" name="actief" value={String(material.actief)} />
          <p className="text-xs text-muted-foreground">
            Stapgrootte (optioneel): wordt verkocht per veelvoud van deze hoeveelheid.
          </p>
          <PhotoInput currentUrl={material.foto} />
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
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-3">
        <ActiveMiniToggle materialOptionId={material.id} actief={material.actief} />
        {material.foto && (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
          <img
            src={material.foto}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md border border-border object-cover"
          />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{material.naam}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(material.prijs)}
            {material.stapgrootte
              ? ` — per ${material.stapgrootte} ${unitLabel(productEenheid)}`
              : ""}
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
        <DeleteMaterialForm materialOptionId={material.id} />
      </div>
    </div>
  );
}

function ActiveMiniToggle({
  materialOptionId,
  actief,
}: {
  materialOptionId: string;
  actief: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onChange={(e) => {
        const formData = new FormData(e.currentTarget);
        startTransition(() => toggleMaterialOptionActiveAction(formData));
      }}
    >
      <input type="hidden" name="materialOptionId" value={materialOptionId} />
      <input type="hidden" name="actief" value={String(actief)} />
      <Switch defaultChecked={actief} disabled={pending} />
    </form>
  );
}

function DeleteMaterialForm({ materialOptionId }: { materialOptionId: string }) {
  return (
    <form
      action={deleteMaterialOptionAction}
      onSubmit={(e) => {
        if (!confirm("Weet je zeker dat je dit materiaal wilt verwijderen?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="materialOptionId" value={materialOptionId} />
      <Button type="submit" variant="ghost" size="icon" aria-label="Verwijderen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}

function NewMaterialForm({
  materialCategoryId,
  productEenheid,
}: {
  materialCategoryId: string;
  productEenheid: string;
}) {
  const action = createMaterialOptionAction.bind(null, materialCategoryId);
  const [state, formAction, pending] = useActionState<MaterialOptionFormState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-material-naam">Naam</Label>
        <Input id="new-material-naam" name="naam" placeholder="Bijv. Standaardkleur" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-material-prijs">Prijs</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
            <DecimalInput id="new-material-prijs" name="prijs" placeholder="0" className="pl-7" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-material-stapgrootte">Stapgrootte</Label>
          <div className="relative">
            <DecimalInput
              id="new-material-stapgrootte"
              name="stapgrootte"
              placeholder="bijv. 1.8"
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {unitLabel(productEenheid)}
            </span>
          </div>
        </div>
      </div>
      <input type="hidden" name="actief" value="on" />
      <PhotoInput />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          <Plus className="h-4 w-4" />
          Materiaal toevoegen
        </Button>
      </div>
    </form>
  );
}
