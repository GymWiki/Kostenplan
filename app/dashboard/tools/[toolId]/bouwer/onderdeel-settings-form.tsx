"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { OnderdeelConfig } from "@/app/lib/calculator-engine";
import { saveOnderdeelBibliotheekAction } from "@/app/lib/actions/onderdelen";
import type { OnderdeelBibliotheek } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { IconPicker } from "@/app/components/ui/icon-picker";

// Instellingenpaneel (kolom 2) wanneer een heel Onderdeel geselecteerd is
// (i.p.v. één van zijn Vragen/Prijsregels) — de inline tegenhanger van het
// naam/beschrijving-blok bovenin de oude OnderdeelEditorOverlay. Zelfde
// commit-per-wijziging-aanpak als veld-settings-form.tsx/regel-settings-
// form.tsx; `key={onderdeel.id}` op de aanroepplek reset lokale state.
export function OnderdeelSettingsForm({
  toolId,
  onderdeel,
  onChange,
  onOpgeslagenInBibliotheek,
}: {
  toolId: string;
  onderdeel: OnderdeelConfig;
  onChange: (onderdeel: OnderdeelConfig) => void;
  onOpgeslagenInBibliotheek: (item: OnderdeelBibliotheek) => void;
}) {
  const [naam, setNaam] = useState(onderdeel.naam);
  const [beschrijving, setBeschrijving] = useState(onderdeel.beschrijving ?? "");
  const [opslaanInBibliotheekBezig, setOpslaanInBibliotheekBezig] = useState(false);
  const [opgeslagenInBibliotheek, setOpgeslagenInBibliotheek] = useState(false);

  function commit(overrides: Partial<{ naam: string; beschrijving: string; icoon: string | null; actief: boolean }>) {
    onChange({
      ...onderdeel,
      naam: overrides.naam ?? naam,
      beschrijving: (overrides.beschrijving ?? beschrijving).trim() || undefined,
      icoon: overrides.icoon !== undefined ? (overrides.icoon ?? undefined) : onderdeel.icoon,
      actief: overrides.actief ?? onderdeel.actief,
    });
  }

  async function opslaanAlsMijnOnderdeel() {
    setOpslaanInBibliotheekBezig(true);
    const result = await saveOnderdeelBibliotheekAction(toolId, onderdeel.id, { naam: onderdeel.naam, beschrijving: onderdeel.beschrijving });
    setOpslaanInBibliotheekBezig(false);
    if (result.success) {
      setOpgeslagenInBibliotheek(true);
      onOpgeslagenInBibliotheek(result.item);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="onderdeel-naam">Naam van dit onderdeel</Label>
        <Input
          id="onderdeel-naam"
          value={naam}
          onChange={(e) => {
            setNaam(e.target.value);
            commit({ naam: e.target.value });
          }}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="onderdeel-beschrijving">Beschrijving (optioneel)</Label>
        <Input
          id="onderdeel-beschrijving"
          value={beschrijving}
          onChange={(e) => {
            setBeschrijving(e.target.value);
            commit({ beschrijving: e.target.value });
          }}
          placeholder="Bijv. Kosten voor het plaatsen van een nieuwe schutting"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Icoon</Label>
        <IconPicker name="onderdeel-icoon" defaultValue={onderdeel.icoon ?? null} onChange={(icoon) => commit({ icoon })} />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">Actief</span>
        <Switch checked={onderdeel.actief} onChange={(e) => commit({ actief: e.target.checked })} />
      </label>

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={opslaanAlsMijnOnderdeel} disabled={opslaanInBibliotheekBezig}>
        <Save className="h-4 w-4" />
        {opgeslagenInBibliotheek ? "Opgeslagen als Mijn onderdeel" : "Opslaan als Mijn onderdeel"}
      </Button>
    </div>
  );
}
