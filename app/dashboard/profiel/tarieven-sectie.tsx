"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BevestigDialoog } from "@/app/components/ui/bevestig-dialoog";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Field } from "@/app/components/ui/field";
import { Select } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { OpslaanStatus, useAutoSave } from "@/app/components/instellingen/use-autosave";
import { saveBedrijfTarievenAction } from "@/app/lib/actions/tarieven";
import { previewRekenEenheidAction, previewUrenAction, wijzigBedrijfRekenEenheidAction, wijzigUrenAction, type RekenEenheidSamenvatting, type UrenSamenvatting } from "@/app/lib/actions/werktempo";
import { EenheidWisselUitleg } from "@/app/components/dashboard/eenheid-wissel-uitleg";
import { EENHEID_NAAM, formatWerktempo, valideerUrenConfig, type UrenFouten } from "@/app/lib/werktempo";
import { parseGetal } from "@/app/lib/getal";

type Eenheid = "UUR" | "DAGDEEL" | "DAG";
const EENHEID_LABEL: Record<Eenheid, string> = { DAGDEEL: "dagdeel (ochtend of middag)", DAG: "dag", UUR: "uur" };

// Tarieven voor alle rekentools van dit bedrijf. In de rekentool-editor staat
// bij Werktempo en Vaste kosten een link "Wijzigen" naar dezelfde waarden.
export function TarievenSectie({
  start,
}: {
  start: { eenheid: Eenheid; tarief: number; voorrij: number; transport: number; urenPerDagdeel: number; urenPerDag: number };
}) {
  const router = useRouter();
  const [eenheid, setEenheid] = useState<Eenheid>(start.eenheid);
  // Een andere eenheid kiezen gaat via een dialog: de werktempo's van je onderdelen worden omgerekend en de prijs blijft gelijk.
  const [wissel, setWissel] = useState<{ naar: Eenheid; tools: RekenEenheidSamenvatting[] } | null>(null);
  const [wisselBezig, setWisselBezig] = useState(false);
  const [wisselFout, setWisselFout] = useState<string | null>(null);

  async function kiesEenheid(naar: Eenheid) {
    if (naar === eenheid) return;
    const r = await previewRekenEenheidAction("alle", naar);
    if (!r.ok) {
      setWisselFout(r.error);
      return;
    }
    // Nog geen rekentools: niets om om te rekenen.
    if (r.tools.length === 0) {
      setEenheid(naar);
      return;
    }
    setWisselFout(null);
    setWissel({ naar, tools: r.tools });
  }
  async function bevestigEenheid() {
    if (!wissel) return;
    setWisselBezig(true);
    const r = await wijzigBedrijfRekenEenheidAction(wissel.naar).catch(() => ({ ok: false as const, error: "Wijzigen is niet gelukt. Controleer je verbinding en probeer het opnieuw." }));
    setWisselBezig(false);
    if (!r.ok) {
      setWisselFout(r.error);
      return;
    }
    const eerste = wissel.tools[0];
    if (eerste) setTarief(String(Math.round(eerste.nieuwTarief * 100) / 100));
    setEenheid(wissel.naar);
    setWissel(null);
    router.refresh();
  }
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
            <Select id="profiel-eenheid" value={eenheid} onChange={(e) => void kiesEenheid(e.target.value as Eenheid)}>
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
          {wisselFout && !wissel && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {wisselFout}
            </p>
          )}
          <OpslaanStatus stand={auto.stand} bericht={auto.bericht} opnieuw={auto.opnieuw} />
          <UrenDefinities start={{ urenPerDagdeel: start.urenPerDagdeel, urenPerDag: start.urenPerDag }} />
        </div>
      </CardContent>
      <BevestigDialoog open={wissel !== null} titel="Rekenen met een andere eenheid?" onBevestig={() => void bevestigEenheid()} onAnnuleer={() => { setWissel(null); setWisselFout(null); }} bezig={wisselBezig} fout={wisselFout}>
        {wissel && <EenheidWisselUitleg naar={wissel.naar} tools={wissel.tools} />}
      </BevestigDialoog>
    </Card>
  );
}

const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`;

// "Een dagdeel is … uur" en "Een dag is … uur". Opslaan vraagt eerst om bevestiging met het effect op je onderdelen.
function UrenDefinities({ start }: { start: { urenPerDagdeel: number; urenPerDag: number } }) {
  const router = useRouter();
  const [dagdeel, setDagdeel] = useState(String(start.urenPerDagdeel).replace(".", ","));
  const [dag, setDag] = useState(String(start.urenPerDag).replace(".", ","));
  const [fouten, setFouten] = useState<UrenFouten>({});
  const [samenvatting, setSamenvatting] = useState<UrenSamenvatting | null>(null);
  const [modus, setModus] = useState<"gelijk" | "meebewegen">("gelijk");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);

  const getal = (t: string) => {
    const r = parseGetal(t, { soort: "getal" });
    return r.ok ? r.waarde : NaN;
  };
  const gewijzigd = getal(dagdeel) !== start.urenPerDagdeel || getal(dag) !== start.urenPerDag;

  async function opslaan() {
    setOpgeslagen(false);
    const v = valideerUrenConfig({ urenPerDagdeel: getal(dagdeel), urenPerDag: getal(dag) });
    if (!v.ok) {
      setFouten(v.fouten);
      return;
    }
    setFouten({});
    const r = await previewUrenAction({ urenPerDagdeel: dagdeel, urenPerDag: dag });
    if (!r.ok) {
      setFouten(r.fouten);
      return;
    }
    setModus("gelijk");
    setFout(null);
    setSamenvatting(r.samenvatting);
  }
  async function bevestig() {
    setBezig(true);
    const r = await wijzigUrenAction({ urenPerDagdeel: dagdeel, urenPerDag: dag, modus }).catch(() => ({ ok: false as const, error: "Wijzigen is niet gelukt. Controleer je verbinding en probeer het opnieuw." }));
    setBezig(false);
    if (!r.ok) {
      setFout("error" in r && r.error ? r.error : "Opslaan is niet gelukt.");
      if ("fouten" in r && r.fouten) setFouten(r.fouten);
      return;
    }
    setSamenvatting(null);
    setOpgeslagen(true);
    router.refresh();
  }

  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
      <legend className="sr-only">Hoeveel uur is een dagdeel en een dag</legend>
      <p className="text-sm font-semibold text-foreground">Hoeveel uur is een dagdeel en een dag?</p>
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <Field label="Een dagdeel is … uur" htmlFor="profiel-uren-dagdeel" error={fouten.urenPerDagdeel}>
          <UnitInput id="profiel-uren-dagdeel" suffix="uur" value={dagdeel} onChange={(e) => { setDagdeel(e.target.value); setOpgeslagen(false); }} aria-invalid={fouten.urenPerDagdeel ? true : undefined} />
        </Field>
        <Field label="Een dag is … uur" htmlFor="profiel-uren-dag" error={fouten.urenPerDag}>
          <UnitInput id="profiel-uren-dag" suffix="uur" value={dag} onChange={(e) => { setDag(e.target.value); setOpgeslagen(false); }} aria-invalid={fouten.urenPerDag ? true : undefined} />
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">Standaard 4 en 8 uur. Decimalen mogen (bijv. 7,5). Hiermee reken je een werktempo per uur, dagdeel of dag om.</p>
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" className="h-11" disabled={!gewijzigd} onClick={() => void opslaan()}>
          Uren opslaan
        </Button>
        {opgeslagen && <span role="status" className="text-sm text-muted-foreground">Opgeslagen</span>}
      </div>
      <BevestigDialoog open={samenvatting !== null} titel="Uren aanpassen?" onBevestig={() => void bevestig()} onAnnuleer={() => setSamenvatting(null)} bezig={bezig} fout={fout}>
        {samenvatting && <UrenUitleg s={samenvatting} modus={modus} setModus={setModus} />}
      </BevestigDialoog>
    </fieldset>
  );
}

function UrenUitleg({ s, modus, setModus }: { s: UrenSamenvatting; modus: "gelijk" | "meebewegen"; setModus: (m: "gelijk" | "meebewegen") => void }) {
  return (
    <>
      <p>
        Een dagdeel wordt <strong>{formatWerktempo(s.nieuw.urenPerDagdeel)} uur</strong> (nu {formatWerktempo(s.oud.urenPerDagdeel)}) en een dag <strong>{formatWerktempo(s.nieuw.urenPerDag)} uur</strong> (nu {formatWerktempo(s.oud.urenPerDag)}).
      </p>
      <p>
        Het werktempo van je onderdelen blijft in zijn eigen eenheid staan: 12 m² per dag blijft 12 m² per dag. Onderdelen die in dezelfde eenheid rekenen als je rekentool behouden hun prijs. Je bestaande offertes en aanvragen veranderen niet.
      </p>
      {s.rakend.length === 0 ? (
        <p>Geen van je {meervoud(s.aantalProducten, "onderdeel", "onderdelen")} rekent in een andere eenheid dan je rekentool: <strong>er verandert niets aan je prijzen</strong>.</p>
      ) : (
        <>
          <p>
            <strong>{meervoud(s.rakend.length, "onderdeel rekent", "onderdelen rekenen")}</strong> in een andere eenheid dan je rekentool. Hun prijs hangt van deze uren af:
          </p>
          <ul className="list-disc pl-5">
            {s.rakend.slice(0, 5).map((r) => (
              <li key={`${r.toolNaam}-${r.naam}`}>
                {r.naam} <span className="text-muted-foreground">({EENHEID_NAAM[r.eenheid].enkelvoud}{r.werktempo !== null && r.nieuwWerktempo !== null ? `: ${formatWerktempo(r.werktempo)} wordt ${formatWerktempo(r.nieuwWerktempo)}` : ""})</span>
              </li>
            ))}
            {s.rakend.length > 5 && <li>en nog {s.rakend.length - 5}</li>}
          </ul>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Wat wil je met hun prijs?</legend>
            <label className="flex min-h-11 cursor-pointer items-start gap-2">
              <input type="radio" name="uren-modus" className="mt-1" checked={modus === "gelijk"} onChange={() => setModus("gelijk")} />
              <span>Prijs gelijk houden (hun werktempo wordt aangepast)</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-2">
              <input type="radio" name="uren-modus" className="mt-1" checked={modus === "meebewegen"} onChange={() => setModus("meebewegen")} />
              <span>Prijs laten meebewegen met de nieuwe uren (werktempo blijft staan)</span>
            </label>
          </fieldset>
        </>
      )}
    </>
  );
}
