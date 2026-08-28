"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, FilePlus, SearchX } from "lucide-react";
import { createToolFromTemplateAction, createModulaireToolFromTemplateAction, type TemplateToolFormState } from "@/app/lib/actions/tools";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { NieuweToolForm } from "./nieuwe-tool-form";
import { TemplateToolbar } from "./template-toolbar";
import { TemplateCard } from "./template-card";
import { TemplatePreviewModal } from "./template-preview-modal";

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

const ALLE_CATEGORIEEN = "Alle";

// "Kies een startpunt" (Herontwerp "Nieuwe rekentool"): eerst de primaire
// keuze "zelf beginnen" vs. "sjabloon gebruiken", dan zoeken/filteren, dan
// een preview vóór je 'm daadwerkelijk gebruikt, dan pas de naam-stap. Geen
// tussenpagina die zegt "deze tool is gekoppeld aan template X" (Deel 29
// van de oorspronkelijke opdracht): na het aanmaken is de tool volledig
// zelfstandig, precies zoals createToolFromTemplateAction /
// createModulaireToolFromTemplateAction het bouwen — de preview-modal hier
// is puur eenmalig, vestigt geen blijvende relatie.
export function StartpuntKiezer({ templates }: { templates: TemplateSamenvatting[] }) {
  const [startpunt, setStartpunt] = useState<Startpunt>(null);
  const [zoekterm, setZoekterm] = useState("");
  const [categorie, setCategorie] = useState(ALLE_CATEGORIEEN);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateSamenvatting | null>(null);

  const categorieen = useMemo(() => [ALLE_CATEGORIEEN, ...new Set(templates.map((t) => t.categorie))], [templates]);

  const zichtbareTemplates = useMemo(() => {
    const q = zoekterm.trim().toLowerCase();
    return templates.filter((t) => {
      if (categorie !== ALLE_CATEGORIEEN && t.categorie !== categorie) return false;
      if (!q) return true;
      const doorzoekbaar = [t.naam, t.categorie, t.beschrijving, ...(t.onderdeelNamen ?? [])].join(" ").toLowerCase();
      return doorzoekbaar.includes(q);
    });
  }, [templates, zoekterm, categorie]);

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
    <div className="flex flex-col gap-8">
      {/* Zelf beginnen: een zelfstandige primaire keuze, geen gewone
          template-card — dashed border + neutrale achtergrond onderscheidt
          'm bewust van de sjabloon-grid hieronder. */}
      <section aria-labelledby="startpunt-heading">
        <h2 id="startpunt-heading" className="sr-only">
          Startpunt
        </h2>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <FilePlus className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Zelf beginnen</p>
              <p className="text-sm text-muted-foreground">Start met een lege rekentool en bouw alles zelf op.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setStartpunt({ soort: "leeg" })} className="w-full shrink-0 sm:w-auto">
            Begin vanaf 0 →
          </Button>
        </div>
      </section>

      <section aria-labelledby="sjablonen-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="sjablonen-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sjablonen
          </h2>
          <p className="text-sm text-muted-foreground">Kies een sjabloon en pas &apos;m daarna volledig aan naar jouw bedrijf.</p>
        </div>

        <TemplateToolbar
          zoekterm={zoekterm}
          onZoektermChange={setZoekterm}
          categorieen={categorieen}
          actieveCategorie={categorie}
          onCategorieChange={setCategorie}
        />

        {zichtbareTemplates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <SearchX className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Geen sjablonen gevonden</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We konden geen sjablonen vinden{zoekterm ? ` voor "${zoekterm}"` : " in deze categorie"}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoekterm("");
                setCategorie(ALLE_CATEGORIEEN);
              }}
            >
              Zoekopdracht aanpassen
            </Button>
            <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Of begin helemaal vanaf 0</p>
              <Button type="button" size="sm" onClick={() => setStartpunt({ soort: "leeg" })}>
                Lege rekentool maken
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {zichtbareTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={() => setPreviewTemplate(template)} />
            ))}
          </div>
        )}
      </section>

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onGebruik={() => {
            setStartpunt({ soort: "template", template: previewTemplate });
            setPreviewTemplate(null);
          }}
        />
      )}
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
