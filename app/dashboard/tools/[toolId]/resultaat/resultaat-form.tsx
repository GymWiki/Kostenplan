"use client";

import { useActionState } from "react";
import { updateResultaatConfigAction, type ToolResultaatFormState } from "@/app/lib/actions/tools";
import { PRIJS_WEERGAVE_LABELS, PRIJS_AFRONDING_LABELS, CTA_LABELS, type ToolResultaatConfig } from "@/app/lib/tools";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input, Label, Select, Textarea } from "@/app/components/ui/input";

export function ResultaatForm({ toolId, config }: { toolId: string; config: ToolResultaatConfig }) {
  const [state, formAction, pending] = useActionState<ToolResultaatFormState, FormData>(
    updateResultaatConfigAction.bind(null, toolId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Resultaatinstellingen opgeslagen.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prijsweergave</CardTitle>
          <CardDescription>Hoe de berekende prijs aan je klant wordt getoond.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prijsWeergave">Weergave</Label>
            <Select id="prijsWeergave" name="prijsWeergave" defaultValue={config.prijsWeergave}>
              {Object.entries(PRIJS_WEERGAVE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="afronding">Afronding</Label>
            <Select id="afronding" name="afronding" defaultValue={config.afronding}>
              {Object.entries(PRIJS_AFRONDING_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call-to-action</CardTitle>
          <CardDescription>De knop en toelichting die je klant na de berekening ziet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ctaType">Actietype</Label>
            <Select id="ctaType" name="ctaType" defaultValue={config.ctaType}>
              {Object.entries(CTA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ctaTekst">Knoptekst (optioneel)</Label>
            <Input
              id="ctaTekst"
              name="ctaTekst"
              defaultValue={config.ctaTekst ?? ""}
              placeholder="Bijv. Vraag nu je offerte aan"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="toelichting">Toelichting (optioneel)</Label>
            <Textarea
              id="toelichting"
              name="toelichting"
              defaultValue={config.toelichting ?? ""}
              placeholder="Bijv. Dit is een indicatie. Je ontvangt binnen 1 werkdag een definitieve offerte."
              maxLength={300}
            />
          </div>
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
