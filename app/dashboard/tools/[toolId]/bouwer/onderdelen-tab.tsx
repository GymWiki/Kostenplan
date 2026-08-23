"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { OnderdeelConfig } from "@/app/lib/calculator-engine";
import { duplicateOnderdeelAction, addOnderdeelFromBibliotheekAction } from "@/app/lib/actions/onderdelen";
import type { OnderdeelBibliotheek } from "@/app/generated/prisma/client";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import { OnderdeelToevoegenModal } from "./onderdeel-toevoegen-modal";
import { OnderdeelEditorOverlay } from "./onderdeel-editor-overlay";

// Fase 5 (Deel 6 van de opdracht): "een Tool moet Onderdelen kunnen
// toevoegen/bewerken/verwijderen/dupliceren/herordenen/activeren" — de
// volgorde in `onderdelen` bepaalt de klant-doorloopvolgorde (zie
// engine-calculator.tsx, dat elk actief Onderdeel als één stap rendert).
export function OnderdelenTab({
  toolId,
  onderdelen,
  onChange,
  materiaalOpties,
  onMateriaalOptiesChange,
  resultaatInstellingen,
  btwPercentage,
  bedrijfsnaam,
  email,
  subscriptionTier,
  branding,
  onderdeelBibliotheek,
  onOnderdeelBibliotheekChange,
}: {
  toolId: string;
  onderdelen: OnderdeelConfig[];
  onChange: (onderdelen: OnderdeelConfig[]) => void;
  materiaalOpties: Record<string, MateriaalOptie[]>;
  onMateriaalOptiesChange: (materiaalOpties: Record<string, MateriaalOptie[]>) => void;
  resultaatInstellingen: import("@/app/lib/calculator-engine").CalculatorResultSettings;
  btwPercentage: number;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: import("@/app/generated/prisma/client").SubscriptionTier;
  branding: import("@/app/generated/prisma/client").Branding | null;
  onderdeelBibliotheek: OnderdeelBibliotheek[];
  onOnderdeelBibliotheekChange: (items: OnderdeelBibliotheek[]) => void;
}) {
  const [toevoegenOpen, setToevoegenOpen] = useState(false);
  const [bewerkOnderdeelId, setBewerkOnderdeelId] = useState<string | null>(null);
  const [verwijderOnderdeel, setVerwijderOnderdeel] = useState<OnderdeelConfig | null>(null);
  const [bezigId, setBezigId] = useState<string | null>(null);

  const gesorteerd = [...onderdelen].sort((a, b) => a.order - b.order);

  function herorden(nieuw: OnderdeelConfig[]) {
    onChange(nieuw.map((o, i) => ({ ...o, order: i })));
  }

  function verplaats(index: number, richting: -1 | 1) {
    const doel = index + richting;
    if (doel < 0 || doel >= gesorteerd.length) return;
    const nieuw = [...gesorteerd];
    [nieuw[index], nieuw[doel]] = [nieuw[doel], nieuw[index]];
    herorden(nieuw);
  }

  function toggleActief(onderdeel: OnderdeelConfig) {
    onChange(onderdelen.map((o) => (o.id === onderdeel.id ? { ...o, actief: !o.actief } : o)));
  }

  function verwijder(onderdeel: OnderdeelConfig) {
    herorden(gesorteerd.filter((o) => o.id !== onderdeel.id));
    setVerwijderOnderdeel(null);
  }

  function voegToe(nieuwOnderdeel: OnderdeelConfig) {
    onChange([...onderdelen, { ...nieuwOnderdeel, order: onderdelen.length }]);
    setToevoegenOpen(false);
    setBewerkOnderdeelId(nieuwOnderdeel.id);
  }

  async function dupliceer(onderdeel: OnderdeelConfig) {
    setBezigId(onderdeel.id);
    const result = await duplicateOnderdeelAction(toolId, onderdeel.id);
    setBezigId(null);
    if (result.success) {
      onChange([...onderdelen, result.onderdeel]);
    }
  }

  async function voegToeVanuitBibliotheek(bibliotheekId: string) {
    const result = await addOnderdeelFromBibliotheekAction(toolId, bibliotheekId);
    if (result.success) voegToe(result.onderdeel);
  }

  const bewerkOnderdeel = bewerkOnderdeelId ? onderdelen.find((o) => o.id === bewerkOnderdeelId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Onderdelen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stel je rekentool samen uit zelfstandige onderdelen — elk met eigen vragen en prijsregels.
          </p>
        </div>
        <Button type="button" onClick={() => setToevoegenOpen(true)}>
          <Plus className="h-4 w-4" />
          Onderdeel toevoegen
        </Button>
      </div>

      {gesorteerd.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nog geen onderdelen. Voeg je eerste onderdeel toe om te beginnen.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {gesorteerd.map((onderdeel, i) => (
            <Card key={onderdeel.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{onderdeel.naam}</p>
                    <Badge variant={onderdeel.actief ? "success" : "muted"}>{onderdeel.actief ? "Actief" : "Uit"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {onderdeel.velden.length} {onderdeel.velden.length === 1 ? "vraag" : "vragen"} · {onderdeel.regels.length}{" "}
                    {onderdeel.regels.length === 1 ? "prijsregel" : "prijsregels"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => verplaats(i, -1)} disabled={i === 0} aria-label="Omhoog">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => verplaats(i, 1)}
                    disabled={i === gesorteerd.length - 1}
                    aria-label="Omlaag"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => toggleActief(onderdeel)} aria-label="Activeren/deactiveren">
                    <input type="checkbox" checked={onderdeel.actief} readOnly className="h-4 w-4 accent-primary" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setBewerkOnderdeelId(onderdeel.id)} aria-label="Bewerken">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => dupliceer(onderdeel)}
                    disabled={bezigId === onderdeel.id}
                    aria-label="Dupliceren"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setVerwijderOnderdeel(onderdeel)} aria-label="Verwijderen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {toevoegenOpen && (
        <OnderdeelToevoegenModal
          toolId={toolId}
          onClose={() => setToevoegenOpen(false)}
          onToegevoegd={voegToe}
          onderdeelBibliotheek={onderdeelBibliotheek}
          onKiesUitBibliotheek={voegToeVanuitBibliotheek}
        />
      )}

      {bewerkOnderdeel && (
        <OnderdeelEditorOverlay
          toolId={toolId}
          onderdeel={bewerkOnderdeel}
          onChange={(nieuw) => onChange(onderdelen.map((o) => (o.id === nieuw.id ? nieuw : o)))}
          onClose={() => setBewerkOnderdeelId(null)}
          materiaalOpties={materiaalOpties}
          onMateriaalOptiesChange={onMateriaalOptiesChange}
          resultaatInstellingen={resultaatInstellingen}
          btwPercentage={btwPercentage}
          bedrijfsnaam={bedrijfsnaam}
          email={email}
          subscriptionTier={subscriptionTier}
          branding={branding}
          onOpgeslagenInBibliotheek={(item) => onOnderdeelBibliotheekChange([item, ...onderdeelBibliotheek])}
        />
      )}

      <ConfirmDialog
        open={verwijderOnderdeel != null}
        onClose={() => setVerwijderOnderdeel(null)}
        onConfirm={() => verwijderOnderdeel && verwijder(verwijderOnderdeel)}
        title={`"${verwijderOnderdeel?.naam}" verwijderen?`}
        description="Dit onderdeel en al zijn vragen en prijsregels worden verwijderd uit deze rekentool."
      />
    </div>
  );
}
