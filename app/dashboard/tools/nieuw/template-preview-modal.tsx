"use client";

import { Check } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { Button } from "@/app/components/ui/button";
import { templateIcon } from "./template-card";
import type { TemplateSamenvatting } from "./startpunt-kiezer";

// Voorkomt dat iemand per ongeluk een groot sjabloon initialiseert zonder te
// weten wat erin zit (Herontwerp "Nieuwe rekentool", Deel 10) — een verplicht
// tussenschermpje vóór de naam-stap. Géén nieuwe, blijvende "gekoppeld aan
// template X"-relatie (dat bewuste ontwerpprincipe uit startpunt-kiezer.tsx
// blijft overeind): dit is puur een eenmalige preview vóór het aanmaken.
export function TemplatePreviewModal({
  template,
  onClose,
  onGebruik,
}: {
  template: TemplateSamenvatting;
  onClose: () => void;
  onGebruik: () => void;
}) {
  return (
    <Overlay open onClose={onClose} ariaLabel={`Voorbeeld van sjabloon ${template.naam}`} className="flex items-center justify-center p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {templateIcon(template.icoon, "h-5 w-5")}
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{template.naam}</h3>
            <p className="text-sm text-muted-foreground">{template.categorie}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{template.beschrijving}</p>

        {template.soort === "modulair" && template.onderdeelNamen && template.onderdeelNamen.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Dit sjabloon bevat:</p>
            <ul className="flex flex-col gap-1.5">
              {template.onderdeelNamen.map((naam) => (
                <li key={naam} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {naam}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Je krijgt een basisopzet met vragen en prijsberekeningen voor &ldquo;{template.categorie}&rdquo;.</p>
        )}

        <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          Je kunt alle vragen, prijzen en uitstraling na het aanmaken naar wens aanpassen.
        </p>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="button" onClick={onGebruik}>
            Dit sjabloon gebruiken →
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
