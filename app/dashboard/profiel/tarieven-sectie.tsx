"use client";

import { useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Field } from "@/app/components/ui/field";
import { Select } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { OpslaanStatus, useAutoSave } from "@/app/components/instellingen/use-autosave";
import { saveBedrijfTarievenAction } from "@/app/lib/actions/tarieven";

type Eenheid = "UUR" | "DAGDEEL" | "DAG";
const EENHEID_LABEL: Record<Eenheid, string> = { DAGDEEL: "dagdeel (ochtend of middag)", DAG: "dag", UUR: "uur" };

// Tarieven voor alle rekentools van dit bedrijf. In de rekentool-editor staat
// bij Werktempo en Vaste kosten een link "Wijzigen" naar dezelfde waarden.
export function TarievenSectie({
  start,
}: {
  start: { eenheid: Eenheid; tarief: number; voorrij: number; transport: number };
}) {
  const [eenheid, setEenheid] = useState<Eenheid>(start.eenheid);
  const [tarief, setTarief] = useState(String(start.tarief));
  const [voorrij, setVoorrij] = useState(String(start.voorrij));
  const [transport, setTransport] = useState(String(start.transport));
  const auto = useAutoSave({ eenheid, tarief, voorrij, transport }, async (w) => {
    const r = await saveBedrijfTarievenAction(w);
    if (!r.ok) return { ok: false, fout: r.error };
    return { ok: true, melding: r.overgeslagen.length ? `niet aangepast (andere rekeneenheid): ${r.overgeslagen.join(", ")}` : undefined };
  });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Field label="Hoe bereken je je arbeid?" htmlFor="profiel-eenheid">
            <Select id="profiel-eenheid" value={eenheid} onChange={(e) => setEenheid(e.target.value as Eenheid)}>
              {(Object.keys(EENHEID_LABEL) as Eenheid[]).map((k) => (
                <option key={k} value={k}>
                  Per {EENHEID_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Tarief per ${eenheid === "DAGDEEL" ? "dagdeel" : EENHEID_LABEL[eenheid]}`} htmlFor="profiel-tarief" hint="Wat je de klant rekent, inclusief marge.">
            <UnitInput id="profiel-tarief" prefix="€" value={tarief} onChange={(e) => setTarief(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <Field label="Voorrijkosten" htmlFor="profiel-voorrij" hint="Eén keer per klus.">
              <UnitInput id="profiel-voorrij" prefix="€" value={voorrij} onChange={(e) => setVoorrij(e.target.value)} />
            </Field>
            <Field label="Transport" htmlFor="profiel-transport" hint="Eén keer per klus.">
              <UnitInput id="profiel-transport" prefix="€" value={transport} onChange={(e) => setTransport(e.target.value)} />
            </Field>
          </div>
          <OpslaanStatus stand={auto.stand} bericht={auto.bericht} opnieuw={auto.opnieuw} />
        </div>
      </CardContent>
    </Card>
  );
}
