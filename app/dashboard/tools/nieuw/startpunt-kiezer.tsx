"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, FilePlus, Layers } from "lucide-react";
import { createToolFromTemplateAction, createModulaireToolFromTemplateAction, type TemplateToolFormState } from "@/app/lib/actions/tools";
import { getProductIcon } from "@/app/lib/icons";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { NieuweToolForm } from "./nieuwe-tool-form";

export type TemplateSamenvatting = {
  id: string;
  // "vlak" = bestaande, platte (versie-1) template — één calculator.
  // "modulair" = Levering B v2, meerdere Onderdelen tegelijk (Deel 7).
  soort: "vlak" | "modulair";
  naam: string;
  categorie: string;
  beschrijving: string;
  watHetBerekent: string;
  resterendWerk: string;
  icoon: string;
  onderdelenAantal?: number;
  onderdeelNamen?: string[];
};

type Startpunt = { soort: "template"; template: TemplateSamenvatting } | { soort: "leeg" } | null;

// "Kies een startpunt" (Deel 28, uitgebreid met Deel 7 modulaire
// templates): templates + een lege rekentool, in twee stappen — eerst
// kiezen, dan een naam geven. Geen tussenpagina die zegt "deze tool is
// gekoppeld aan template X" (Deel 29): na het aanmaken is de tool volledig
// zelfstandig, precies zoals createToolFromTemplateAction /
// createModulaireToolFromTemplateAction het bouwen.
export function StartpuntKiezer({ templates }: { templates: TemplateSamenvatting[] }) {
  const [startpunt, setStartpunt] = useState<Startpunt>(null);

  if (startpunt?.soort === "template") {
    return <TemplateNaamStap template={startpunt.template} onTerug={() => setStartpunt(null)} />;
  }
  if (startpunt?.soort === "leeg") {
    return (
      <div className="flex flex-col gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => setStartpunt(null)} className="w-fit">
          <ArrowLeft className="h-3.5 w-3.5" />
          Ander startpunt kiezen
        </Button>
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="font-medium text-foreground">Lege rekentool</p>
              <p className="text-sm text-muted-foreground">Je stelt vragen, prijzen en huisstijl helemaal zelf in.</p>
            </div>
            <NieuweToolForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const Icon = getProductIcon(template.icoon);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setStartpunt({ soort: "template", template })}
              className="text-left"
            >
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    {Icon && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{template.naam}</p>
                      <p className="text-xs text-muted-foreground">{template.categorie}</p>
                    </div>
                    {template.soort === "modulair" && template.onderdelenAantal != null && (
                      <Badge variant="muted" className="shrink-0 gap-1">
                        <Layers className="h-3 w-3" />
                        {template.onderdelenAantal} onderdelen
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.beschrijving}</p>
                  {template.soort === "modulair" && template.onderdeelNamen && template.onderdeelNamen.length > 0 && (
                    <p className="text-xs text-muted-foreground">{template.onderdeelNamen.join(" · ")}</p>
                  )}
                  <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Berekent: </span>
                      {template.watHetBerekent}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Nog te doen: </span>
                      {template.resterendWerk}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => setStartpunt({ soort: "leeg" })} className="text-left">
        <Card className="cursor-pointer transition-colors hover:border-primary/40">
          <CardContent className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <FilePlus className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Lege rekentool</p>
              <p className="text-sm text-muted-foreground">Voor een unieke berekening — stel zelf alles samen.</p>
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}

function TemplateNaamStap({ template, onTerug }: { template: TemplateSamenvatting; onTerug: () => void }) {
  const action = (template.soort === "modulair" ? createModulaireToolFromTemplateAction : createToolFromTemplateAction).bind(null, template.id);
  const [state, formAction, pending] = useActionState<TemplateToolFormState, FormData>(action, null);

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" onClick={onTerug} className="w-fit">
        <ArrowLeft className="h-3.5 w-3.5" />
        Ander startpunt kiezen
      </Button>
      <Card className="max-w-lg">
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="font-medium text-foreground">{template.naam}</p>
            <p className="text-sm text-muted-foreground">{template.beschrijving}</p>
          </div>
          <form action={formAction} className="flex flex-col gap-4">
            {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="naam">Naam van de rekentool</Label>
              <Input id="naam" name="naam" placeholder={template.naam} required autoFocus />
            </div>
            <input type="hidden" name="icoon" value="" />
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Aanmaken…" : "Rekentool aanmaken"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
