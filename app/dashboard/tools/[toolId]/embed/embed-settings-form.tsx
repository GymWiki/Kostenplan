"use client";

import { useActionState, useState } from "react";
import { updateEmbedConfigAction } from "@/app/lib/actions/tools";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DecimalInput, Label, Select } from "@/app/components/ui/input";
import type { ToolEmbedConfig } from "@/app/lib/tools";

// Embedinstellingen (Deel 27 van de opdracht) — updateEmbedConfigAction
// revalidateert de pagina zelf, dus de embedcode/preview eronder (die
// server-side wordt opgebouwd) ververst vanzelf mee na opslaan.
export function EmbedSettingsForm({
  toolId,
  embedConfig,
}: {
  toolId: string;
  embedConfig: ToolEmbedConfig;
}) {
  const [state, formAction, pending] = useActionState(updateEmbedConfigAction.bind(null, toolId), null);
  const [breedte, setBreedte] = useState(embedConfig.breedte);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instellingen</CardTitle>
        <CardDescription>Hoe de iframe eruitziet op de website van je klant.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="breedte">Breedte</Label>
              <Select id="breedte" name="breedte" value={breedte} onChange={(e) => setBreedte(e.target.value as ToolEmbedConfig["breedte"])}>
                <option value="VOLLEDIG">Volledige breedte van de omgeving</option>
                <option value="VAST">Vaste breedte</option>
              </Select>
            </div>
            {breedte === "VAST" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vasteBreedtePx">Vaste breedte (px)</Label>
                <DecimalInput id="vasteBreedtePx" name="vasteBreedtePx" defaultValue={embedConfig.vasteBreedtePx} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minimaleHoogtePx">Minimale hoogte (px)</Label>
            <DecimalInput id="minimaleHoogtePx" name="minimaleHoogtePx" defaultValue={embedConfig.minimaleHoogtePx} />
            <p className="text-xs text-muted-foreground">
              Past zich daarna automatisch aan de inhoud aan — dit is alleen het startpunt, voorkomt een
              lege sprong bij het laden.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="radiusPx">Afronding hoeken (px)</Label>
            <DecimalInput id="radiusPx" name="radiusPx" defaultValue={embedConfig.radiusPx} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="toonBorder"
              defaultChecked={embedConfig.toonBorder}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Rand tonen rond de rekentool
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="transparanteAchtergrond"
              defaultChecked={embedConfig.transparanteAchtergrond}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Transparante achtergrond (neemt de achtergrondkleur van je website over)
          </label>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Opslaan…" : "Instellingen opslaan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
