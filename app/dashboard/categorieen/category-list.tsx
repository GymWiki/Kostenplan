"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  type CategoryFormState,
} from "@/app/lib/actions/categories";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

type CategoryWithCounts = {
  id: string;
  naam: string;
  _count: { services: number; products: number };
};

export function CategoryList({
  categories,
}: {
  categories: CategoryWithCounts[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <NewCategoryForm />
      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Je hebt nog geen categorieën. Maak er hierboven een aan, bijvoorbeeld
            &ldquo;Bestrating&rdquo; of &ldquo;Beplanting&rdquo;.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NewCategoryForm() {
  const [state, formAction, pending] = useActionState<
    CategoryFormState,
    FormData
  >(createCategoryAction, null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <Input name="naam" placeholder="Naam van nieuwe categorie" required />
        {state?.error && (
          <p className="mt-1.5 text-sm text-destructive">{state.error}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="shrink-0">
        <Plus className="h-4 w-4" />
        Categorie toevoegen
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryWithCounts }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditCategoryRow category={category} onDone={() => setEditing(false)} />;
  }

  const itemCount = category._count.services + category._count.products;

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{category.naam}</p>
        <Badge variant="muted" className="mt-1">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Badge>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Bewerken"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <DeleteCategoryForm categoryId={category.id} />
      </div>
    </li>
  );
}

function EditCategoryRow({
  category,
  onDone,
}: {
  category: CategoryWithCounts;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCategoryAction(category.id, null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <li className="p-4">
      <form action={handleSubmit} className="flex items-center gap-2">
        <Input name="naam" defaultValue={category.naam} required autoFocus />
        <Button type="submit" variant="secondary" size="icon" disabled={pending} aria-label="Opslaan">
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDone} aria-label="Annuleren">
          <X className="h-4 w-4" />
        </Button>
      </form>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </li>
  );
}

function DeleteCategoryForm({ categoryId }: { categoryId: string }) {
  return (
    <form
      action={deleteCategoryAction}
      onSubmit={(e) => {
        if (!confirm("Weet je zeker dat je deze categorie wilt verwijderen?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <Button type="submit" variant="ghost" size="icon" aria-label="Verwijderen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
