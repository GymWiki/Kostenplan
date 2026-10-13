"use client";

import { Field } from "@/app/components/ui/field";
import { Input, Select, Textarea } from "@/app/components/ui/input";
import { plusDagen } from "@/app/lib/factuur/maak";
import { termijnWaarschuwing } from "@/app/lib/factuur/controle";
import type { FactuurInhoud, FactuurMeta } from "@/app/lib/factuur/model";
import type { Wijzig } from "@/app/components/offerte/offerte-paneel";

// Het paneel "Nummer en datums" van de factuur: factuurdatum, uitvoering, betaaltermijn, btw-behandeling en betaallink.
export function FactuurMetaPaneel({ inhoud, wijzig }: { inhoud: FactuurInhoud; wijzig: Wijzig }) {
  const f = inhoud.factuur;
  const zet = (patch: Partial<FactuurMeta>) => wijzig((i) => ({ ...i, factuur: { ...(i as FactuurInhoud).factuur, ...patch } }) as typeof i);
  const credit = f.soort === "creditnota";
  const tw = termijnWaarschuwing(f.uitvoeringTot || f.uitvoeringVan);
  const kanVerleggen = inhoud.klant.type === "zakelijk" && !inhoud.afzender.korActief;
  return (
    <div className="flex flex-col gap-4">
      <Field label={credit ? "Creditnotanummer" : "Factuurnummer"} htmlFor="fm-nr" hint="Wordt toegekend bij “Definitief maken” en nooit hergebruikt.">
        <Input id="fm-nr" value={f.nummer ?? "Nog geen nummer"} readOnly />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={credit ? "Datum" : "Factuurdatum"} htmlFor="fm-datum">
          <Input
            id="fm-datum"
            type="date"
            value={f.factuurdatum}
            onChange={(e) => zet({ factuurdatum: e.target.value, ...(credit || !/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? {} : { vervaldatum: plusDagen(e.target.value, f.betaaltermijnDagen) }) })}
          />
        </Field>
        {!credit && (
          <Field label="Betaaltermijn in dagen" htmlFor="fm-dagen">
            <Input
              id="fm-dagen"
              inputMode="numeric"
              value={String(f.betaaltermijnDagen)}
              onChange={(e) => {
                const dagen = Number(e.target.value.replace(/\D/g, "")) || 0;
                zet({ betaaltermijnDagen: dagen, ...(/^\d{4}-\d{2}-\d{2}$/.test(f.factuurdatum) ? { vervaldatum: plusDagen(f.factuurdatum, dagen) } : {}) });
              }}
            />
          </Field>
        )}
      </div>
      {!credit && (
        <Field label="Vervaldatum" htmlFor="fm-verval" hint="De factuurdatum plus de betaaltermijn; je kunt hem ook zelf kiezen.">
          <Input id="fm-verval" type="date" value={f.vervaldatum} onChange={(e) => zet({ vervaldatum: e.target.value })} />
        </Field>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={f.soort === "termijn" ? "Datum vooruitbetaling" : "Uitvoeringsdatum"} htmlFor="fm-uitv" hint={f.soort === "termijn" ? undefined : "Wanneer het werk is gedaan, of de startdatum van een periode."}>
          <Input id="fm-uitv" type="date" value={f.uitvoeringVan} onChange={(e) => zet({ uitvoeringVan: e.target.value })} />
        </Field>
        {f.soort !== "termijn" && (
          <Field label="Uitvoering t/m (optioneel)" htmlFor="fm-uitv-tot" hint="Alleen bij een periode.">
            <Input id="fm-uitv-tot" type="date" value={f.uitvoeringTot} onChange={(e) => zet({ uitvoeringTot: e.target.value })} />
          </Field>
        )}
      </div>
      {tw && (
        <p role="status" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">
          {tw.soort === "te-laat" ? `Een factuur moet uiterlijk op ${tw.uiterlijk} verstuurd zijn (15e van de maand na de uitvoering). Die datum is voorbij: verstuur hem zo snel mogelijk.` : `Een factuur moet uiterlijk op ${tw.uiterlijk} verstuurd zijn (15e van de maand na de uitvoering): nog ${tw.dagen} ${tw.dagen === 1 ? "dag" : "dagen"}.`}
        </p>
      )}
      {!inhoud.afzender.korActief && (
        <Field label="Btw" htmlFor="fm-btw">
          <Select id="fm-btw" value={f.btwModus} disabled={!kanVerleggen && f.btwModus === "normaal"} onChange={(e) => zet({ btwModus: e.target.value as FactuurMeta["btwModus"] })}>
            <option value="normaal">Btw berekenen (normaal)</option>
            <option value="verlegd" disabled={!kanVerleggen}>Btw verlegd (onderaanneming, zakelijke klant)</option>
          </Select>
        </Field>
      )}
      {f.btwModus === "verlegd" && (
        <Field label="Btw-id van de klant" htmlFor="fm-klantbtw" hint="Verplicht bij btw verlegd. Formaat NL123456789B01.">
          <Input id="fm-klantbtw" value={f.klantBtwId} onChange={(e) => zet({ klantBtwId: e.target.value.toUpperCase() })} />
        </Field>
      )}
      {!credit && (
        <Field label="Betaallink (optioneel)" htmlFor="fm-link" hint="Bijvoorbeeld een betaalverzoek uit je bankapp. Komt op de factuur te staan.">
          <Input id="fm-link" type="url" inputMode="url" value={f.betaallink} onChange={(e) => zet({ betaallink: e.target.value })} placeholder="https://…" />
        </Field>
      )}
      <Field label="Notitie voor jezelf" htmlFor="fm-notitie" hint="Komt niet op de factuur, bijvoorbeeld “Akkoord klant op 14-10”.">
        <Textarea id="fm-notitie" value={f.notitie} onChange={(e) => zet({ notitie: e.target.value })} />
      </Field>
    </div>
  );
}
