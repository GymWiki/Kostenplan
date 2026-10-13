"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { updateCompanyDetailsAction, type CompanyFormState } from "@/app/lib/actions/companies";

// Naam, KvK-nummer en adres van het bedrijf (zelfde velden en actie als voorheen, nu in een eigen scherm).
export function BedrijfsgegevensFormulier({ company }: { company: { id: string; naam: string; kvkNummer: string | null; adres: string | null } }) {
  const action = updateCompanyDetailsAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, null);
  const opgeslagen = state && !state.error && !state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`naam-${company.id}`}>Bedrijfsnaam</Label>
        <Input id={`naam-${company.id}`} name="naam" defaultValue={company.naam} required />
        {state?.fieldErrors?.naam && <p className="text-sm text-destructive">{state.fieldErrors.naam}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`kvk-${company.id}`}>KvK-nummer (optioneel)</Label>
        <Input id={`kvk-${company.id}`} name="kvkNummer" defaultValue={company.kvkNummer ?? ""} inputMode="numeric" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`adres-${company.id}`}>Adres (optioneel)</Label>
        <Input id={`adres-${company.id}`} name="adres" defaultValue={company.adres ?? ""} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
        {opgeslagen && !pending && <p role="status" className="text-sm text-muted-foreground">Opgeslagen.</p>}
      </div>
    </form>
  );
}
