"use client";

import { useState } from "react";
import { Copy, Plus, Puzzle, Trash2 } from "lucide-react";
import type { OnderdeelConfig, ValidatieMelding } from "@/app/lib/calculator-engine";
import { duplicateOnderdeelAction, addOnderdeelFromBibliotheekAction } from "@/app/lib/actions/onderdelen";
import type { OnderdeelBibliotheek } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { Switch } from "@/app/components/ui/switch";
import { SortableList } from "@/app/components/ui/sortable-list";
import { getProductIcon } from "@/app/lib/icons";
import type { MateriaalOptie } from "@/app/portaal/[slug]/engine-fields";
import { OnderdeelToevoegenModal } from "./onderdeel-toevoegen-modal";
import { OnderdeelEditorOverlay } from "./onderdeel-editor-overlay";
import { BuilderListRow } from "./builder-list-row";
import { StatusIndicator, type BouwerStatus } from "./status-indicator";

// Fase 5 (Deel 6 van de opdracht): "een Tool moet Onderdelen kunnen
// toevoegen/bewerken/verwijderen/dupliceren/herordenen/activeren" — de
// volgorde in `onderdelen` bepaalt de klant-doorloopvolgorde (zie
// engine-calculator.tsx, dat elk actief Onderdeel als één stap rendert).
//
// UI/UX-herontwerp: compacte rij (naam/icoon/status/meta), echte drag-and-
// drop i.p.v. pijltjesknoppen, "Bewerken" als enige primaire actie,
// dupliceren/verwijderen achter "•••" i.p.v. losse icoonknoppen.
function statusVoorOnderdeel(onderdeel: OnderdeelConfig, meldingen: ValidatieMelding[]): BouwerStatus {
  if (!onderdeel.actief) return "concept";
  const heeftFout = meldingen.some(
    (m) =>
      m.ernst === "FOUT" &&
      (m.boodschap.startsWith(`Onderdeel "${onderdeel.naam}"`) || m.boodschap.startsWith(`${onderdeel.naam}:`))
  );
  return heeftFout ? "actie-nodig" : "klaar";
}

export function OnderdelenTab({
  toolId,
  onderdelen,
  onChange,
  meldingen,
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
  meldingen: ValidatieMelding[];
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Onderdelen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stel je rekentool samen uit zelfstandige onderdelen — elk met eigen vragen en prijsregels.
          </p>
        </div>
        <Button type="button" onClick={() => setToevoegenOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Onderdeel toevoegen</span>
          <span className="sm:hidden">Toevoegen</span>
        </Button>
      </div>

      {gesorteerd.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Puzzle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Je hebt nog geen onderdelen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Voeg je eerste onderdeel toe — kies een voorbeeld om snel te starten, of begin helemaal zelf.
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setToevoegenOpen(true)}>
              <Plus className="h-4 w-4" />
              Onderdeel toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SortableList
          dndContextId="onderdelen-lijst"
          items={gesorteerd}
          onReorder={herorden}
          renderItem={(onderdeel, dragHandleProps) => {
            const Icon = getProductIcon(onderdeel.icoon) ?? Puzzle;
            const status = statusVoorOnderdeel(onderdeel, meldingen);
            return (
              <BuilderListRow
                dragHandleProps={dragHandleProps}
                icon={
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                }
                title={onderdeel.naam}
                badge={<StatusIndicator status={status} />}
                meta={
                  <>
                    {onderdeel.velden.length} {onderdeel.velden.length === 1 ? "vraag" : "vragen"} ·{" "}
                    {onderdeel.regels.length} {onderdeel.regels.length === 1 ? "prijsregel" : "prijsregels"}
                  </>
                }
                extra={
                  <Switch
                    checked={onderdeel.actief}
                    onChange={() => toggleActief(onderdeel)}
                    aria-label={onderdeel.actief ? "Onderdeel uitschakelen" : "Onderdeel inschakelen"}
                  />
                }
                onEdit={() => setBewerkOnderdeelId(onderdeel.id)}
                menuItems={[
                  {
                    label: bezigId === onderdeel.id ? "Bezig met dupliceren…" : "Dupliceren",
                    icon: Copy,
                    onSelect: () => dupliceer(onderdeel),
                    disabled: bezigId === onderdeel.id,
                  },
                  {
                    label: "Verwijderen",
                    icon: Trash2,
                    onSelect: () => setVerwijderOnderdeel(onderdeel),
                    destructive: true,
                  },
                ]}
              />
            );
          }}
        />
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
