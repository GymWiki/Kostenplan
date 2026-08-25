"use client";

import { useActionState } from "react";
import { updateLeadFormConfigAction, type ToolResultaatFormState } from "@/app/lib/actions/tools";
import type { ToolLeadFormConfig } from "@/app/lib/tools";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";

const VELDEN: { name: keyof ToolLeadFormConfig; label: string; toelichting: string }[] = [
  { name: "vraagTelefoon", label: "Telefoonnummer", toelichting: "Handig om snel contact op te nemen." },
  { name: "vraagAdres", label: "Straatnaam", toelichting: "Bijv. nodig om de reisafstand in te schatten." },
  { name: "vraagPostcode", label: "Postcode", toelichting: "Samen met huisnummer het volledige adres." },
  { name: "vraagHuisnummer", label: "Huisnummer", toelichting: "Samen met postcode het volledige adres." },
  { name: "vraagOpmerking", label: "Opmerking", toelichting: "Vrij tekstveld voor extra wensen of vragen." },
];

export function LeadFormConfigForm({ toolId, config }: { toolId: string; config: ToolLeadFormConfig }) {
  const [state, formAction, pending] = useActionState<ToolResultaatFormState, FormData>(
    updateLeadFormConfigAction.bind(null, toolId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground" aria-live="polite">
          Aanvraagformulier opgeslagen.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Altijd gevraagd</CardTitle>
          <CardDescription>Naam en e-mailadres zijn nodig om een aanvraag te kunnen opvolgen.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optionele velden</CardTitle>
          <CardDescription>Kies welke extra gegevens je van je klant vraagt.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {VELDEN.map((veld) => (
            <label key={veld.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <input
                type="checkbox"
                name={veld.name}
                defaultChecked={config[veld.name]}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{veld.label}</span>
                <span className="block text-xs text-muted-foreground">{veld.toelichting}</span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Instellingen opslaan"}
        </Button>
      </div>
    </form>
  );
}
