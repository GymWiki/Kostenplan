"use client";

import { useState } from "react";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { Ruler } from "lucide-react";
import { Field } from "@/app/components/ui/field";
import { Button } from "@/app/components/ui/button";
import { createWerkzaamheidAction } from "@/app/lib/actions/werkzaamheden";
import { kopieerWerkzaamheidAction } from "@/app/lib/actions/rekentools";
import { HOVENIER_PRESETS, presetNaarDraft, type HovenierPreset } from "@/app/lib/presets";
import type { WerkzaamheidDraft } from "@/app/lib/werkzaamheid";
import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

export type AndereRekentool = { id: string; naam: string; werkzaamheden: { id: string; naam: string }[] };

const IETS_ANDERS: WerkzaamheidDraft = {
  naam: "Nieuwe onderdeel",
  methode: "M2",
  productiviteit: "",
  transportPerDag: false,
  bandbreedte: false,
  werktempoPerMateriaal: false,
  materialen: [{ sleutel: "nieuw-start", naam: "Materiaal", prijs: "0", prijsMin: "0", prijsMax: "0", productiviteitOverride: "", isVoorbeeld: true }],
  extras: [],
};

// Presetkiezer in het paneel (geen aparte wizard): kies, en de werkzaamheid
// staat meteen in de rekentool met voorbeeldprijzen.
export function PaneelToevoegen({
  toolId,
  stapEenheid,
  anderen,
  bestaandeNamen,
  onToegevoegd,
}: {
  toolId: string;
  stapEenheid: ArbeidStapEenheid;
  anderen: AndereRekentool[];
  bestaandeNamen: string[];
  onToegevoegd: (productId: string) => void;
}) {
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bronTool, setBronTool] = useState(anderen[0]?.id ?? "");
  const gekozenTool = anderen.find((t) => t.id === bronTool);

  async function maak(sleutel: string, draft: WerkzaamheidDraft, presetId: string | null) {
    setBezig(sleutel);
    setFout(null);
    const r = await createWerkzaamheidAction(toolId, draft, presetId);
    setBezig(null);
    if (r.ok) onToegevoegd(r.productId);
    else setFout(r.error);
  }

  async function kopieer(productId: string) {
    setBezig(`kopie:${productId}`);
    setFout(null);
    const r = await kopieerWerkzaamheidAction(productId, toolId);
    setBezig(null);
    if (r.ok) onToegevoegd(r.productId);
    else setFout(r.error);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Onderdeel toevoegen</h2>
        <p className="text-sm text-muted-foreground">Kies een startpunt. De prijzen zijn voorbeelden die je daarna zelf aanpast.</p>
      </div>
      {fout && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {fout}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2">
        {HOVENIER_PRESETS.map((p: HovenierPreset) => {
          const Icoon = PRODUCT_ICONS[p.icoon] ?? Ruler;
          const bestaat = bestaandeNamen.some((n) => n.trim().toLowerCase() === p.naam.toLowerCase());
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={bezig !== null}
                onClick={() => maak(p.id, presetNaarDraft(p, stapEenheid), p.id)}
                className="flex min-h-20 w-full cursor-pointer flex-col items-start gap-2 rounded-lg border-[1.5px] border-input bg-card p-3 text-left text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
              >
                <Icoon className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="min-w-0 break-words">{bezig === p.id ? "Toevoegen…" : p.naam}</span>
                {bestaat && <span className="text-xs font-normal text-muted-foreground">Staat er al in</span>}
              </button>
            </li>
          );
        })}
        <li className="col-span-2">
          <button
            type="button"
            disabled={bezig !== null}
            onClick={() => maak("anders", IETS_ANDERS, null)}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-input px-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {bezig === "anders" ? "Toevoegen…" : "Iets anders (leeg beginnen)"}
          </button>
        </li>
      </ul>

      {anderen.length > 0 && (
        <section aria-labelledby="kopieer-titel" className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <h3 id="kopieer-titel" className="font-bold text-foreground">
            Kopiëren uit een andere rekentool
          </h3>
          <Field label="Rekentool" htmlFor="bron-tool">
            <select
              id="bron-tool"
              value={bronTool}
              onChange={(e) => setBronTool(e.target.value)}
              className="h-11 w-full rounded-md border-[1.5px] border-input bg-card px-2 text-base text-foreground"
            >
              {anderen.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.naam}
                </option>
              ))}
            </select>
          </Field>
          {gekozenTool && gekozenTool.werkzaamheden.length === 0 && (
            <p className="text-sm text-muted-foreground">Deze rekentool heeft nog geen onderdelen.</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {gekozenTool?.werkzaamheden.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{w.naam}</span>
                <Button type="button" variant="outline" className="h-11" disabled={bezig !== null} onClick={() => kopieer(w.id)}>
                  {bezig === `kopie:${w.id}` ? "Kopiëren…" : "Kopieer hierheen"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
