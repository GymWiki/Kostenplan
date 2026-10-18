"use client";

import { useState } from "react";
import { BevestigDialoog } from "@/app/components/ui/bevestig-dialoog";
import { Field } from "@/app/components/ui/field";
import { Select } from "@/app/components/ui/input";
import { formatGetalInvoer } from "@/app/lib/getal";
import { parseGetal } from "@/app/lib/sjablonen";
import { EENHEID_NAAM, formatWerktempo, planProductWissel, type UrenConfig, type WerktempoEenheid } from "@/app/lib/werktempo";
import type { WerkzaamheidDraft } from "@/app/lib/werkzaamheid";
import { useEditorRepository } from "./repository";

const cap = (t: string) => t[0]!.toUpperCase() + t.slice(1);

// "Rekenen met": in welke eenheid het werktempo van dit onderdeel staat. Standaard volgt het de eenheid van je rekentool; een eigen eenheid
// kies je met een bevestigingsdialog waarin je ziet hoe het werktempo wordt omgerekend (de prijs blijft gelijk).
export function WerktempoEenheidKeuze({
  productId,
  naam,
  draft,
  setDraft,
  globaal,
  uren,
  eenheidKort,
  onFout,
}: {
  productId: string;
  naam: string;
  draft: WerkzaamheidDraft;
  setDraft: (f: (d: WerkzaamheidDraft) => WerkzaamheidDraft) => void;
  globaal: WerktempoEenheid;
  uren: UrenConfig;
  // "m²", "m", "stuks": de eenheid van de hoeveelheid, voor in de dialog ("12 m² per uur").
  eenheidKort: string;
  onFout: (f: string) => void;
}) {
  const repo = useEditorRepository();
  const [keuze, setKeuze] = useState<WerktempoEenheid | "standaard" | null>(null);
  const [bezig, setBezig] = useState(false);
  const [dialoogFout, setDialoogFout] = useState<string | null>(null);

  // Gasten rekenen altijd in de eenheid van hun tarief; zonder opslag op de server valt er niets om te zetten.
  if (!repo.wijzigWerktempoEenheid) return null;

  const eigen = draft.werktempoEenheid ?? null;
  const waarde: WerktempoEenheid | "standaard" = eigen ?? "standaard";
  const plan = keuze === null ? null : planProductWissel(
    {
      id: productId,
      naam,
      eenheid: eigen,
      werktempo: parseGetal(draft.productiviteit, 0) > 0 ? parseGetal(draft.productiviteit, 0) : null,
      materiaalTempos: draft.materialen.map((m) => ({ id: m.id ?? m.sleutel, werktempo: draft.werktempoPerMateriaal && parseGetal(m.productiviteitOverride, 0) > 0 ? parseGetal(m.productiviteitOverride, 0) : null })),
      arbeidTariefOverride: null,
    },
    keuze === "standaard" ? null : keuze,
    globaal,
    uren
  );

  async function bevestig() {
    if (!plan || keuze === null) return;
    setBezig(true);
    setDialoogFout(null);
    // Alleen de materialen die al in de database staan gaan mee; nieuwe, nog niet opgeslagen rijen worden hieronder alleen in het concept omgerekend.
    const opgeslagen = new Set(draft.materialen.filter((m) => m.id).map((m) => m.id!));
    const r = await repo.wijzigWerktempoEenheid!(productId, {
      eenheid: plan.eenheid,
      werktempo: plan.werktempo,
      materiaalTempos: plan.materiaalTempos.filter((m) => opgeslagen.has(m.id)),
    });
    setBezig(false);
    if (!r.ok) {
      setDialoogFout(r.error);
      return;
    }
    const nieuw = new Map(plan.materiaalTempos.map((m) => [m.id, m.werktempo]));
    setDraft((d) => ({
      ...d,
      werktempoEenheid: plan.eenheid,
      productiviteit: plan.werktempo === null ? d.productiviteit : formatGetalInvoer(plan.werktempo),
      materialen: d.materialen.map((m) => {
        const w = nieuw.get(m.id ?? m.sleutel);
        return w === undefined || w === null ? m : { ...m, productiviteitOverride: formatGetalInvoer(w) };
      }),
    }));
    setKeuze(null);
  }

  const standaardNaam = EENHEID_NAAM[globaal].enkelvoud;
  const van = plan ? EENHEID_NAAM[plan.van].enkelvoud : "";
  const naar = plan ? EENHEID_NAAM[plan.naar].enkelvoud : "";
  const oudTempo = parseGetal(draft.productiviteit, 0);

  return (
    <div className="flex flex-col gap-2">
      <Field label="Rekenen met" htmlFor={`wz-eenheid-${productId}`} hint={eigen ? undefined : "Het werktempo staat in de eenheid van je rekentool."}>
        <Select
          id={`wz-eenheid-${productId}`}
          value={waarde}
          onChange={(e) => {
            const v = e.target.value as WerktempoEenheid | "standaard";
            if (v === waarde) return;
            setDialoogFout(null);
            setKeuze(v);
          }}
        >
          <option value="standaard">Standaard ({standaardNaam})</option>
          {(["UUR", "DAGDEEL", "DAG"] as WerktempoEenheid[]).map((e) => (
            <option key={e} value={e}>
              {cap(EENHEID_NAAM[e].enkelvoud)}
            </option>
          ))}
        </Select>
      </Field>
      {eigen && (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>Eigen instelling (je rekentool rekent per {standaardNaam}).</span>
          <button
            type="button"
            className="min-h-11 cursor-pointer font-semibold text-foreground underline"
            onClick={() => {
              setDialoogFout(null);
              setKeuze("standaard");
            }}
          >
            Terugzetten naar standaard
          </button>
        </p>
      )}
      <BevestigDialoog open={plan !== null} titel={keuze === "standaard" ? "Terug naar de standaard eenheid?" : "Rekenen met een andere eenheid?"} onBevestig={() => void bevestig()} onAnnuleer={() => setKeuze(null)} bezig={bezig} fout={dialoogFout}>
        {plan && (
          <>
            <p>
              Dit onderdeel rekent nu per <strong>{van}</strong> en straks per <strong>{naar}</strong>
              {keuze === "standaard" ? " (de eenheid van je rekentool)" : ""}.
            </p>
            {plan.verandert && plan.werktempo !== null && oudTempo > 0 ? (
              <p>
                Je werktempo van <strong>{formatWerktempo(oudTempo)} {eenheidKort} per {van}</strong> wordt <strong>{formatWerktempo(plan.werktempo)} {eenheidKort} per {naar}</strong>.
              </p>
            ) : (
              <p>Je hebt nog geen werktempo ingevuld, dus er hoeft niets omgerekend te worden.</p>
            )}
            {draft.werktempoPerMateriaal && plan.materiaalTempos.some((m) => m.werktempo !== null) && <p>Het werktempo per materiaal wordt op dezelfde manier omgerekend.</p>}
            <p>
              <strong>De prijs blijft gelijk.</strong>
            </p>
          </>
        )}
      </BevestigDialoog>
    </div>
  );
}
