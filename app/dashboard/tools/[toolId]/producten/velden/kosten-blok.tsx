"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { DecimalInput, Label } from "@/app/components/ui/input";
import {
  updateMaterialOptionAction,
  type MaterialOptionFormState,
} from "@/app/lib/actions/material-options";
import { berekenProductKosten, type MateriaalRegel } from "@/app/lib/calculate";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import type { MaterialOption } from "@/app/generated/prisma/client";

// Switch "wijkt af voor dit product" + invoerveld, of anders de
// company-instelling als vaste waarde met een link ernaartoe. Gedeeld door
// de arbeid/transport/voorrij-blokken hieronder — elk product krijgt altijd
// deze keuze, geen aparte accountinstelling die dat toestaat/blokkeert.
// `waarde` is de EFFECTIEVE waarde (override, of anders de company-waarde)
// en blijft ook bij het omschakelen van de switch in sync, zodat een live
// voorbeeld ernaast altijd het juiste bedrag laat zien.
export function OverrideVeld({
  titel,
  name,
  companyWaarde,
  companyWaardeTekst,
  defaultOverrideValue,
  instellingenHref,
  waarde,
  onWaardeChange,
  onWijktAfChange,
  error,
  children,
}: {
  titel: string;
  name: string;
  companyWaarde: number;
  companyWaardeTekst: string;
  defaultOverrideValue: number | null;
  instellingenHref: string;
  waarde: string;
  onWaardeChange: (waarde: string) => void;
  // Voor aanroepers zonder native <form>-submit (de wizard bouwt FormData
  // programmatisch) — die moeten zelf weten of de override aan- of uitstaat
  // om 'm wel/niet mee te sturen. Het bewerkscherm heeft dit niet nodig: een
  // uitgeschakelde override stuurt zichzelf al leeg mee via het hidden veld
  // hieronder.
  onWijktAfChange?: (wijktAf: boolean) => void;
  error?: string;
  children?: React.ReactNode;
}) {
  const [wijktAf, setWijktAf] = useState(defaultOverrideValue != null);

  function toggle(nieuw: boolean) {
    setWijktAf(nieuw);
    onWijktAfChange?.(nieuw);
    if (!nieuw) onWaardeChange(String(companyWaarde));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={wijktAf}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        {titel} wijkt af voor dit product
      </label>
      {wijktAf ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
          <DecimalInput
            name={name}
            value={waarde}
            onChange={(e) => onWaardeChange(e.target.value)}
            className="pl-7"
          />
        </div>
      ) : (
        <>
          <input type="hidden" name={name} value="" />
          <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {formatCurrency(companyWaarde)} {companyWaardeTekst} — in te stellen bij{" "}
            <Link href={instellingenHref} className="underline hover:text-foreground">
              Kosteninstellingen
            </Link>
            .
          </p>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {children}
    </div>
  );
}

type PrimaireCategorie = { id: string; materialen: MaterialOption[] } | undefined;

// Blok 1 (materiaalkosten): een kwartier-editor voor het meest voorkomende
// geval — één materiaalcategorie met precies één (vaste-prijs) optie. Heeft
// het product meerdere categorieën of keuzes, dan is er niets eenduidigs om
// hier in te vullen; dan verwijst dit blok naar de materialen-sectie
// verderop, waar per materiaal een eigen prijs staat.
export function MateriaalkostenVeld({
  eenheid,
  primaireCategorie,
  prijs,
  onPrijsChange,
}: {
  eenheid: string;
  primaireCategorie: PrimaireCategorie;
  prijs: string;
  onPrijsChange: (waarde: string) => void;
}) {
  if (!primaireCategorie || primaireCategorie.materialen.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        Voeg hieronder bij Materialen een materiaal toe om een prijs in te stellen.
      </p>
    );
  }

  if (primaireCategorie.materialen.length > 1 || primaireCategorie.materialen[0].prijsType !== "VAST") {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        Je hebt meerdere materiaalkeuzes ingesteld — pas de prijzen per materiaal aan bij Materialen
        hieronder.
      </p>
    );
  }

  return (
    <MateriaalPrijsForm
      optie={primaireCategorie.materialen[0]}
      eenheid={eenheid}
      prijs={prijs}
      onPrijsChange={onPrijsChange}
    />
  );
}

function MateriaalPrijsForm({
  optie,
  eenheid,
  prijs,
  onPrijsChange,
}: {
  optie: MaterialOption;
  eenheid: string;
  prijs: string;
  onPrijsChange: (waarde: string) => void;
}) {
  const action = updateMaterialOptionAction.bind(null, optie.id);
  const [state, formAction, pending] = useActionState<MaterialOptionFormState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <Label htmlFor="materiaalkosten-prijs">Wat vraag je per {unitLabel(eenheid)}?</Label>
      <input type="hidden" name="naam" value={optie.naam} />
      <input type="hidden" name="prijsType" value="VAST" />
      <input type="hidden" name="stapgrootte" value={optie.stapgrootte ?? ""} />
      <input type="hidden" name="productiviteitOverride" value={optie.productiviteitOverride ?? ""} />
      <input type="hidden" name="actief" value={String(optie.actief)} />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
          <DecimalInput
            id="materiaalkosten-prijs"
            name="prijs"
            value={prijs}
            onChange={(e) => onPrijsChange(e.target.value)}
            className="pl-7"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "…" : "Opslaan"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Dit is wat je de klant rekent voor het materiaal — inclusief jouw marge, geen apart
        opslagpercentage.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

// De permanente, doorlopend bijgewerkte uitsplitsing — het belangrijkste
// onderdeel van deze kostenopbouw: hier controleert de vakman of het klopt.
// Gedeeld door het bewerkscherm en de wizard, dezelfde berekening als
// calculate.ts's calculateBreakdown() voor dit ene product gebruikt.
export function KostenUitsplitsing({
  naam,
  hoeveelheid,
  eenheid,
  materiaalRegels,
  materiaalEnabled,
  productiviteit,
  arbeidTarief,
  arbeidEnabled,
  arbeidAfronden,
  transportBedrag,
  transportMeeschalend,
  transportEnabled,
  voorrijBedrag,
  voorrijMeeschalend,
  voorrijEnabled,
}: {
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  // Eén regel per materiaalcategorie — nooit maar de eerste (zie
  // berekenMateriaalRegels in calculate.ts, dezelfde functie die
  // calculateBreakdown() ook gebruikt voor de echte klant-berekening).
  materiaalRegels: MateriaalRegel[];
  materiaalEnabled: boolean;
  productiviteit: number | null;
  arbeidTarief: number;
  arbeidEnabled: boolean;
  arbeidAfronden: boolean;
  transportBedrag: number;
  transportMeeschalend: boolean;
  transportEnabled: boolean;
  voorrijBedrag: number;
  voorrijMeeschalend: boolean;
  voorrijEnabled: boolean;
}) {
  const materiaalTotaal = materiaalRegels.reduce((som, regel) => som + regel.bedrag, 0);
  const kosten = berekenProductKosten({
    materiaalkosten: materiaalTotaal,
    materiaalEnabled,
    hoeveelheid,
    productiviteit,
    arbeidTarief,
    arbeidEnabled,
    arbeidAfronden,
    transportBedrag,
    transportMeeschalend,
    transportEnabled,
    voorrijBedrag,
    voorrijMeeschalend,
    voorrijEnabled,
  });

  const prijsPerEenheid = hoeveelheid > 0 ? kosten.totaal / hoeveelheid : 0;

  const regels: { label: string; omschrijving: string; bedrag: number }[] = [];
  if (materiaalEnabled) {
    for (const materiaalRegel of materiaalRegels) {
      regels.push({
        label: materiaalRegels.length > 1 ? `Materiaal — ${materiaalRegel.categorieNaam}` : "Materiaal",
        omschrijving: `${materiaalRegel.hoeveelheid} ${unitLabel(eenheid)} × ${formatCurrency(materiaalRegel.prijsPerEenheid)}`,
        bedrag: materiaalRegel.bedrag,
      });
    }
  }
  if (arbeidEnabled && kosten.arbeid > 0) {
    regels.push({ label: "Arbeid", omschrijving: "", bedrag: kosten.arbeid });
  }
  if (transportEnabled && kosten.transport > 0) {
    regels.push({ label: "Transport", omschrijving: "", bedrag: kosten.transport });
  }
  if (voorrijEnabled && kosten.voorrijkosten > 0) {
    regels.push({ label: "Voorrijkosten", omschrijving: "", bedrag: kosten.voorrijkosten });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">
        {naam || "Dit product"} van {hoeveelheid} {unitLabel(eenheid)}
      </p>
      <div className="flex flex-col gap-1 text-sm tabular-nums">
        {regels.map((regel, index) => (
          <div key={`${regel.label}-${index}`} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {regel.label}
              {regel.omschrijving && (
                <span className="ml-1.5 text-xs">({regel.omschrijving})</span>
              )}
            </span>
            <span className="font-medium text-foreground">{formatCurrency(regel.bedrag)}</span>
          </div>
        ))}
        <div className="my-1 border-t border-border" />
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-foreground">Totaal</span>
          <span className="font-semibold text-foreground">{formatCurrency(kosten.totaal)}</span>
        </div>
      </div>
      <p className="text-sm text-foreground">
        Dat komt neer op <span className="font-semibold">{formatCurrency(prijsPerEenheid)}</span> per{" "}
        {unitLabel(eenheid)}. Klopt dat ongeveer met wat je normaal rekent?
      </p>
    </div>
  );
}
