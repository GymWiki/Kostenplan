"use client";

import { Search } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Zoekveld + categoriefilters boven de template-grid (Herontwerp "Nieuwe
// rekentool", Deel 11/12) — puur client-side state, geen server-roundtrip:
// met hooguit een tiental templates is filteren in-memory ruim snel genoeg,
// en dit voorkomt een onnodige page-refresh-ervaring bij elke toetsaanslag.
export function TemplateToolbar({
  zoekterm,
  onZoektermChange,
  categorieen,
  actieveCategorie,
  onCategorieChange,
}: {
  zoekterm: string;
  onZoektermChange: (waarde: string) => void;
  categorieen: string[];
  actieveCategorie: string;
  onCategorieChange: (categorie: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={zoekterm}
          onChange={(e) => onZoektermChange(e.target.value)}
          placeholder="Zoek een sjabloon..."
          aria-label="Zoek een sjabloon"
          className="h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter op categorie">
        {categorieen.map((categorie) => {
          const actief = categorie === actieveCategorie;
          return (
            <button
              key={categorie}
              type="button"
              role="tab"
              aria-selected={actief}
              onClick={() => onCategorieChange(categorie)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                actief
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {categorie}
            </button>
          );
        })}
      </div>
    </div>
  );
}
