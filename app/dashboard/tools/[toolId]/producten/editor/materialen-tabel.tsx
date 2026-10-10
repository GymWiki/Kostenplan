"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { cn } from "@/app/lib/cn";
import { legeRij, type MateriaalRij, type RijFout } from "@/app/lib/werkzaamheid";

type Veld = RijFout["veld"];

// Materialen en prijzen: één regel per materiaal (naam | prijs per eenheid |
// verwijderen). Op mobiel staat elk materiaal in een eigen kaartje, naam
// boven, prijs eronder. Met "bandbreedte" krijgt elke regel een van- en
// tot-prijs; met "werktempo per materiaal" een extra kolom.
export function MaterialenTabel({
  rijen,
  onChange,
  eenheidSuffix,
  bandbreedte,
  werktempo,
  tempoSuffix,
  fouten,
  toonAlleFouten = false,
}: {
  rijen: MateriaalRij[];
  onChange: (rijen: MateriaalRij[]) => void;
  eenheidSuffix: string;
  bandbreedte: boolean;
  werktempo: boolean;
  tempoSuffix: string;
  fouten: RijFout[];
  toonAlleFouten?: boolean;
}) {
  const [aangeraakt, setAangeraakt] = useState<Set<string>>(new Set());
  const [focusSleutel, setFocusSleutel] = useState<string | null>(null);

  const raak = (sleutel: string, veld: Veld) => setAangeraakt((s) => new Set(s).add(`${sleutel}:${veld}`));
  const fout = (sleutel: string, veld: Veld) =>
    fouten.find((f) => f.sleutel === sleutel && f.veld === veld && (toonAlleFouten || aangeraakt.has(`${sleutel}:${veld}`)));

  const wijzig = (sleutel: string, patch: Partial<MateriaalRij>) =>
    onChange(rijen.map((r) => (r.sleutel === sleutel ? { ...r, ...patch } : r)));

  // Een gewijzigde prijs is niet langer een voorbeeldprijs.
  const prijsPatch = (patch: Partial<MateriaalRij>): Partial<MateriaalRij> => ({ ...patch, isVoorbeeld: false });

  const kolommen = cn(
    "sm:grid sm:items-start sm:gap-3",
    bandbreedte && werktempo && "sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)_minmax(0,9rem)_2.75rem]",
    bandbreedte && !werktempo && "sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)_2.75rem]",
    !bandbreedte && werktempo && "sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,11rem)_2.75rem]",
    !bandbreedte && !werktempo && "sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_2.75rem]"
  );

  const kop = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("hidden px-1", kolommen)} aria-hidden="true">
        <span className={kop}>Materiaal</span>
        {bandbreedte ? (
          <>
            <span className={kop}>Laagste prijs</span>
            <span className={kop}>Hoogste prijs</span>
          </>
        ) : (
          <span className={kop}>Jouw prijs</span>
        )}
        {werktempo && <span className={kop}>Werktempo</span>}
        <span className={cn(kop, "text-center")}>Weg</span>
      </div>

      {rijen.map((r, index) => {
        const naamFout = fout(r.sleutel, "naam");
        const prijsFout = fout(r.sleutel, "prijs") ?? fout(r.sleutel, "prijsMin") ?? fout(r.sleutel, "prijsMax");
        const tempoFout = fout(r.sleutel, "tempo");
        const id = `mat-${r.sleutel}`;
        return (
          <div key={r.sleutel} className="rounded-lg border border-border bg-muted/40 p-3 sm:border-0 sm:bg-transparent sm:p-0">
            <div className={cn("flex flex-col gap-3", kolommen)}>
              <div className="flex min-w-0 items-start gap-2 sm:contents">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`${id}-naam`} className="mb-1 block text-xs font-bold text-muted-foreground sm:sr-only">
                    Materiaal
                  </label>
                  <Input
                    id={`${id}-naam`}
                    value={r.naam}
                    placeholder="Bijv. Grenen schermen…"
                    autoFocus={focusSleutel === r.sleutel}
                    aria-invalid={naamFout ? true : undefined}
                    onChange={(e) => {
                      raak(r.sleutel, "naam");
                      wijzig(r.sleutel, { naam: e.target.value });
                    }}
                  />
                </div>
                <div className="pt-5 sm:order-last sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onChange(rijen.filter((x) => x.sleutel !== r.sleutel))}
                    disabled={rijen.length <= 1}
                    aria-label={`${r.naam.trim() || `Materiaal ${index + 1}`} verwijderen`}
                    title={rijen.length <= 1 ? "Houd minstens één materiaal" : "Verwijderen"}
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {bandbreedte ? (
                <>
                  <PrijsVeld
                    id={`${id}-min`}
                    label="Laagste prijs"
                    waarde={r.prijsMin}
                    suffix={eenheidSuffix}
                    ongeldig={Boolean(fout(r.sleutel, "prijsMin"))}
                    onChange={(v) => {
                      raak(r.sleutel, "prijsMin");
                      wijzig(r.sleutel, prijsPatch({ prijsMin: v }));
                    }}
                  />
                  <PrijsVeld
                    id={`${id}-max`}
                    label="Hoogste prijs"
                    waarde={r.prijsMax}
                    suffix={eenheidSuffix}
                    voorbeeld={r.isVoorbeeld}
                    ongeldig={Boolean(fout(r.sleutel, "prijsMax"))}
                    onChange={(v) => {
                      raak(r.sleutel, "prijsMax");
                      wijzig(r.sleutel, prijsPatch({ prijsMax: v }));
                    }}
                  />
                </>
              ) : (
                <PrijsVeld
                  id={`${id}-prijs`}
                  label="Jouw prijs"
                  waarde={r.prijs}
                  suffix={eenheidSuffix}
                  voorbeeld={r.isVoorbeeld}
                  ongeldig={Boolean(fout(r.sleutel, "prijs"))}
                  onChange={(v) => {
                    raak(r.sleutel, "prijs");
                    wijzig(r.sleutel, prijsPatch({ prijs: v }));
                  }}
                />
              )}

              {werktempo && (
                <div className="min-w-0">
                  <label htmlFor={`${id}-tempo`} className="mb-1 block text-xs font-bold text-muted-foreground sm:sr-only">
                    Werktempo
                  </label>
                  <UnitInput
                    id={`${id}-tempo`}
                    suffix={tempoSuffix}
                    placeholder="Zelfde als standaard…"
                    value={r.productiviteitOverride}
                    aria-invalid={tempoFout ? true : undefined}
                    onChange={(e) => {
                      raak(r.sleutel, "tempo");
                      wijzig(r.sleutel, { productiviteitOverride: e.target.value });
                    }}
                  />
                </div>
              )}
            </div>
            {(naamFout || prijsFout || tempoFout) && (
              <p role="alert" className="mt-1.5 text-sm font-medium text-destructive">
                {(naamFout ?? prijsFout ?? tempoFout)?.melding}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const rij = legeRij();
          setFocusSleutel(rij.sleutel);
          onChange([...rijen, rij]);
        }}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-input text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Materiaal toevoegen
      </button>
    </div>
  );
}

function PrijsVeld({
  id,
  label,
  waarde,
  suffix,
  voorbeeld,
  ongeldig,
  onChange,
}: {
  id: string;
  label: string;
  waarde: string;
  suffix: string;
  voorbeeld?: boolean;
  ongeldig: boolean;
  onChange: (waarde: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-muted-foreground sm:sr-only">
        {label}
      </label>
      <div className="relative">
        {voorbeeld && (
          <span className="pointer-events-none absolute -top-2 right-2 z-10 rounded bg-example px-1.5 py-px text-[11px] font-bold leading-4 text-example-foreground">
            voorbeeld
          </span>
        )}
        <UnitInput
          id={id}
          prefix="€"
          suffix={suffix}
          value={waarde}
          aria-invalid={ongeldig ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
