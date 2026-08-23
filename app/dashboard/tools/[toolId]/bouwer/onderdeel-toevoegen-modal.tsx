"use client";

import { useState } from "react";
import { FilePlus, Library, Puzzle, Trash2 } from "lucide-react";
import type { OnderdeelConfig } from "@/app/lib/calculator-engine";
import { deleteOnderdeelBibliotheekAction } from "@/app/lib/actions/onderdelen";
import type { OnderdeelBibliotheek } from "@/app/generated/prisma/client";
import { Card, CardContent } from "@/app/components/ui/card";
import { Overlay } from "@/app/components/ui/overlay";
import { Button } from "@/app/components/ui/button";

// "+ Onderdeel toevoegen" (Deel 2 van de opdracht): altijd de keuze tussen
// een bestaand onderdeel gebruiken of zelf vanaf nul beginnen — "Zelf een
// onderdeel maken" is voor iedere gebruiker beschikbaar, nooit verplicht om
// eerst een bibliotheekitem te kiezen. "Bestaand onderdeel gebruiken" toont
// vooralsnog alleen de eigen "Mijn onderdelen"-bibliotheek (Deel 8) — een
// bibliotheek met kant-en-klare sjablonen komt in een latere fase.
export function OnderdeelToevoegenModal({
  onClose,
  onToegevoegd,
  onderdeelBibliotheek,
  onKiesUitBibliotheek,
}: {
  toolId: string;
  onClose: () => void;
  onToegevoegd: (onderdeel: OnderdeelConfig) => void;
  onderdeelBibliotheek: OnderdeelBibliotheek[];
  onKiesUitBibliotheek: (bibliotheekId: string) => void;
}) {
  const [tab, setTab] = useState<"bestaand" | "zelf">(onderdeelBibliotheek.length > 0 ? "bestaand" : "zelf");
  const [bezigId, setBezigId] = useState<string | null>(null);
  const [items, setItems] = useState(onderdeelBibliotheek);

  function maakLeeg() {
    const id = `onderdeel-${Date.now().toString(36)}`;
    onToegevoegd({
      id,
      naam: "Nieuw onderdeel",
      actief: true,
      order: 0,
      velden: [],
      afgeleideVariabelen: [],
      regels: [],
    });
  }

  async function kiesUitBibliotheek(id: string) {
    setBezigId(id);
    onKiesUitBibliotheek(id);
  }

  async function verwijderUitBibliotheek(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteOnderdeelBibliotheekAction(id);
  }

  return (
    <Overlay open onClose={onClose} ariaLabel="Onderdeel toevoegen" className="flex items-center justify-center p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">Onderdeel toevoegen</h3>

        <div className="flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("bestaand")}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === "bestaand" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Bestaand onderdeel gebruiken
          </button>
          <button
            type="button"
            onClick={() => setTab("zelf")}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === "zelf" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Zelf een onderdeel maken
          </button>
        </div>

        {tab === "bestaand" ? (
          items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Library className="h-6 w-6" />
                Nog geen eigen onderdelen opgeslagen.
                <span>
                  Bouw hieronder eerst zelf een onderdeel — je kunt het straks opslaan als &ldquo;Mijn onderdeel&rdquo; voor later
                  hergebruik.
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <Card key={item.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 py-3">
                    <button type="button" onClick={() => kiesUitBibliotheek(item.id)} disabled={bezigId != null} className="flex flex-1 items-center gap-3 text-left">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Puzzle className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.naam}</p>
                        {item.beschrijving && <p className="truncate text-sm text-muted-foreground">{item.beschrijving}</p>}
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => verwijderUitBibliotheek(item.id)}
                      aria-label="Verwijder uit bibliotheek"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="cursor-pointer transition-colors hover:border-primary/40" onClick={maakLeeg}>
            <CardContent className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FilePlus className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-medium text-foreground">Leeg onderdeel</p>
                <p className="text-sm text-muted-foreground">Stel zelf vragen en prijsregels samen — begin helemaal blanco.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
