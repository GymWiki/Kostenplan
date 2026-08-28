"use client";

import { Layers, Puzzle } from "lucide-react";
import { getProductIcon } from "@/app/lib/icons";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import type { TemplateSamenvatting } from "./startpunt-kiezer";

// Losstaande render-helper (geen component-variabele in de render-body van
// TemplateCard zelf) i.v.m. react-hooks/static-components: die regel
// signaleert een dynamisch-opgezocht icoon dat als JSX-tag wordt gebruikt
// binnen een component-body, ook al is de referentie stabiel (dezelfde
// lookup-tabel, geen echte nieuwe component per render).
export function templateIcon(iconNaam: string, className: string) {
  const Icon = getProductIcon(iconNaam) ?? Puzzle;
  return <Icon className={className} />;
}

// Scanbare kaart i.p.v. tekstblok (Herontwerp "Nieuwe rekentool", Deel 6/8):
// icoon, naam (belangrijkste tekst), branche, aantal onderdelen, een korte
// beschrijving (line-clamp-2 — de volledige tekst staat in de preview-
// modal), onderdelen als compacte tags, en een expliciete "Bekijk
// sjabloon →"-actie i.p.v. de eerdere technische "Berekent/Nog te doen"-
// voettekst. Klikken opent altijd eerst de preview-modal, nooit direct de
// aanmaak-stap (Deel 10).
export function TemplateCard({ template, onSelect }: { template: TemplateSamenvatting; onSelect: () => void }) {
  const tags = template.soort === "modulair" ? template.onderdeelNamen : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group h-full rounded-xl text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full cursor-pointer border-border transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/[0.03]">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {templateIcon(template.icoon, "h-5 w-5")}
            </span>
            {template.soort === "modulair" && template.onderdelenAantal != null && (
              <Badge variant="muted" className="shrink-0 gap-1">
                <Layers className="h-3 w-3" aria-hidden="true" />
                {template.onderdelenAantal} {template.onderdelenAantal === 1 ? "onderdeel" : "onderdelen"}
              </Badge>
            )}
          </div>

          <div>
            <p className="font-semibold text-foreground">{template.naam}</p>
            <p className="text-xs text-muted-foreground">{template.categorie}</p>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{template.beschrijving}</p>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
              {tags.length > 4 && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">+{tags.length - 4}</span>}
            </div>
          )}

          <p className="mt-auto flex items-center gap-1 pt-1 text-sm font-medium text-primary">
            Bekijk sjabloon
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
