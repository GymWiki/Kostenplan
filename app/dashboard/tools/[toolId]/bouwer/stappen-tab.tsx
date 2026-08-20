"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { CalculatorField, CalculatorStep } from "@/app/lib/calculator-engine";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input, Label } from "@/app/components/ui/input";

function nieuwStapId(bestaandeIds: Set<string>): string {
  let i = 1;
  while (bestaandeIds.has(`stap${i}`)) i += 1;
  return `stap${i}`;
}

export function StappenTab({
  velden,
  stappen,
  onChange,
}: {
  velden: CalculatorField[];
  stappen: CalculatorStep[];
  onChange: (stappen: CalculatorStep[]) => void;
}) {
  const [nieuweStapTitel, setNieuweStapTitel] = useState("");

  const toegewezenVeldIds = new Set(stappen.flatMap((s) => s.veldIds));
  const nietToegewezen = velden.filter((v) => !toegewezenVeldIds.has(v.id));

  function voegStapToe() {
    if (!nieuweStapTitel.trim()) return;
    onChange([...stappen, { id: nieuwStapId(new Set(stappen.map((s) => s.id))), titel: nieuweStapTitel.trim(), veldIds: [] }]);
    setNieuweStapTitel("");
  }

  function verwijderStap(id: string) {
    onChange(stappen.filter((s) => s.id !== id));
  }

  function verplaats(index: number, richting: -1 | 1) {
    const nieuw = [...stappen];
    const doel = index + richting;
    if (doel < 0 || doel >= nieuw.length) return;
    [nieuw[index], nieuw[doel]] = [nieuw[doel], nieuw[index]];
    onChange(nieuw);
  }

  function toggleVeld(stapId: string, veldId: string) {
    onChange(
      stappen.map((s) =>
        s.id === stapId
          ? { ...s, veldIds: s.veldIds.includes(veldId) ? s.veldIds.filter((id) => id !== veldId) : [...s.veldIds, veldId] }
          : s
      )
    );
  }

  function updateTitel(stapId: string, titel: string) {
    onChange(stappen.map((s) => (s.id === stapId ? { ...s, titel } : s)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Stappen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verdeel je vragen over stappen. Zonder stappen ziet de klant alle vragen op één pagina.
        </p>
      </div>

      {nietToegewezen.length > 0 && stappen.length > 0 && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          {nietToegewezen.length} vraag/vragen ({nietToegewezen.map((v) => v.label).join(", ")}) staan nog bij geen enkele stap en worden
          daardoor niet getoond.
        </p>
      )}

      {stappen.map((stap, i) => (
        <Card key={stap.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input value={stap.titel} onChange={(e) => updateTitel(stap.id, e.target.value)} className="flex-1" />
              <Button type="button" variant="ghost" size="icon" onClick={() => verplaats(i, -1)} disabled={i === 0} aria-label="Omhoog">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => verplaats(i, 1)} disabled={i === stappen.length - 1} aria-label="Omlaag">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => verwijderStap(stap.id)} aria-label="Verwijderen">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vragen in deze stap</Label>
              {velden.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nog geen vragen aangemaakt.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {velden.map((veld) => (
                    <label key={veld.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={stap.veldIds.includes(veld.id)}
                        onChange={() => toggleVeld(stap.id, veld.id)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      {veld.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Input
          value={nieuweStapTitel}
          onChange={(e) => setNieuweStapTitel(e.target.value)}
          placeholder="Naam van de nieuwe stap, bijv. 'Afmetingen'"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), voegStapToe())}
        />
        <Button type="button" variant="secondary" onClick={voegStapToe}>
          <Plus className="h-4 w-4" />
          Stap toevoegen
        </Button>
      </div>
    </div>
  );
}
