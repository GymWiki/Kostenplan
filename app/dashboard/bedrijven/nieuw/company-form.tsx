"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { createCompanyAction, type CompanyFormState } from "@/app/lib/actions/companies";

// cancelHref: null bij de onboarding-pagina (/onboarding/bedrijf) — een
// gebruiker zonder bedrijf heeft nog geen dashboard om naar terug te
// annuleren, dus verbergt dat de knop in plaats van naar "/dashboard" te
// wijzen.
export function CompanyForm({ cancelHref = "/dashboard" }: { cancelHref?: string | null }) {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(
    createCompanyAction,
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
        <Label htmlFor="naam">Bedrijfsnaam</Label>
        <Input id="naam" name="naam" placeholder="Bijv. Jansen Klussenbedrijf" required autoFocus />
        {state?.fieldErrors?.naam && (
          <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {cancelHref && (
          <LinkButton href={cancelHref} variant="outline">
            Annuleren
          </LinkButton>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Aanmaken…" : "Bedrijf aanmaken"}
        </Button>
      </div>
    </form>
  );
}
