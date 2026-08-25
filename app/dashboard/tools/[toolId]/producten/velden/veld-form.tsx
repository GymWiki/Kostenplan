"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DecimalInput, Input, Label, Select } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import type { GetalVeld, KeuzeVeld, RegelgroepVeld, SjabloonVeld, TekstVeld } from "@/app/lib/sjablonen";

// Gedeelde veldrenderer voor sjabloon-gedreven velden — gebruikt zowel voor
// vakman-instellingen (het Hoeveelheid-blok in het bewerkscherm, zie
// product-form.tsx) als straks voor de 4-staps-wizard (Stap 4). Bewust
// controlled met ruwe (string-)waarden i.p.v. direct naar getal/boolean
// omgezet: zo kan de gebruiker gewoon "1," typen zonder dat de state hem
// halverwege terugzet naar "1". De omzetting naar echte types gebeurt pas
// vlak vóór berekenen/opslaan via coerceVeldWaarden() in sjablonen.ts.
export function VeldenRenderer({
  velden,
  waarden,
  onChange,
  idPrefix = "veld",
}: {
  velden: SjabloonVeld[];
  waarden: Record<string, unknown>;
  onChange: (key: string, waarde: unknown) => void;
  idPrefix?: string;
}) {
  return (
    <>
      {velden.map((veld) => (
        <div key={veld.key} className="flex flex-col gap-1.5">
          {veld.soort === "janee" ? (
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch
                checked={Boolean(waarden[veld.key] ?? veld.standaardWaarde ?? false)}
                onChange={(e) => onChange(veld.key, e.target.checked)}
              />
              <p className="text-sm font-medium text-foreground">{veld.label}</p>
            </div>
          ) : veld.soort === "regelgroep" ? (
            <RegelgroepInput
              veld={veld}
              regels={Array.isArray(waarden[veld.key]) ? (waarden[veld.key] as Record<string, unknown>[]) : []}
              onChange={(regels) => onChange(veld.key, regels)}
              idPrefix={`${idPrefix}-${veld.key}`}
            />
          ) : (
            <>
              <Label htmlFor={`${idPrefix}-${veld.key}`}>{veld.label}</Label>
              <VeldInputEnkel
                id={`${idPrefix}-${veld.key}`}
                veld={veld}
                waarde={waarden[veld.key]}
                onChange={(w) => onChange(veld.key, w)}
              />
            </>
          )}
        </div>
      ))}
    </>
  );
}

// Eén los veld (getal/tekst/keuze) — ook hergebruikt als kolom binnen een
// regelgroep-rij, vandaar de losse export.
export function VeldInputEnkel({
  id,
  veld,
  waarde,
  onChange,
}: {
  id?: string;
  veld: GetalVeld | TekstVeld | KeuzeVeld;
  waarde: unknown;
  onChange: (waarde: unknown) => void;
}) {
  if (veld.soort === "getal") {
    return (
      <div className="relative">
        <DecimalInput
          id={id}
          value={waarde == null ? "" : String(waarde)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={veld.standaardWaarde != null ? String(veld.standaardWaarde) : undefined}
          className={veld.eenheid ? "pr-14" : undefined}
        />
        {veld.eenheid && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {veld.eenheid}
          </span>
        )}
      </div>
    );
  }

  if (veld.soort === "keuze") {
    return (
      <Select
        id={id}
        value={waarde == null || waarde === "" ? (veld.standaardWaarde ?? "") : String(waarde)}
        onChange={(e) => onChange(e.target.value)}
      >
        {veld.opties.map((optie) => (
          <option key={optie.waarde} value={optie.waarde}>
            {optie.label}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <Input
      id={id}
      value={waarde == null ? "" : String(waarde)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={veld.placeholder}
    />
  );
}

// Herhaalbare regelgroep — gedeeld tussen Ruimtes (ruimtes) en Artikelregels
// (artikelTypes als instelveld, regels als klantveld). `zichtbaarAls` laat
// een kolom optioneel verbergen op basis van een andere waarde in dezelfde
// rij (bijv. breedte/hoogte alleen bij een artikeltype dat op m² rekent).
export function RegelgroepInput({
  veld,
  regels,
  onChange,
  idPrefix,
}: {
  veld: RegelgroepVeld;
  regels: Record<string, unknown>[];
  onChange: (regels: Record<string, unknown>[]) => void;
  idPrefix: string;
}) {
  const [pendingVerwijderIndex, setPendingVerwijderIndex] = useState<number | null>(null);

  function updateRegel(index: number, kolomKey: string, waarde: unknown) {
    onChange(regels.map((regel, i) => (i === index ? { ...regel, [kolomKey]: waarde } : regel)));
  }

  function verwijderRegel(index: number) {
    onChange(regels.filter((_, i) => i !== index));
  }

  function handleVerwijderKlik(index: number) {
    // Alleen om bevestiging vragen als er al iets is ingevuld — een net
    // toegevoegde, nog lege rij mag zonder omweg weer weg (en autosave
    // in het omringende formulier zou anders zonder waarschuwing echte
    // ingevulde regels kunnen wegschrijven).
    const heeftInhoud = Object.values(regels[index]).some((w) => w !== "" && w != null);
    if (heeftInhoud) setPendingVerwijderIndex(index);
    else verwijderRegel(index);
  }

  function voegRegelToe() {
    const nieuweRegel: Record<string, unknown> = {};
    for (const kolom of veld.kolommen) {
      if (kolom.soort === "keuze") {
        nieuweRegel[kolom.key] = kolom.standaardWaarde ?? kolom.opties[0]?.waarde ?? "";
      } else if (kolom.soort === "getal") {
        nieuweRegel[kolom.key] = kolom.standaardWaarde != null ? String(kolom.standaardWaarde) : "";
      } else {
        nieuweRegel[kolom.key] = "";
      }
    }
    onChange([...regels, nieuweRegel]);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{veld.label}</Label>
      {regels.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Nog niets toegevoegd.
        </p>
      )}
      {regels.map((regel, index) => (
        <div
          key={index}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          {veld.kolommen.map((kolom) => {
            if (veld.zichtbaarAls && !veld.zichtbaarAls(kolom.key, regel)) return null;
            return (
              <div key={kolom.key} className="flex min-w-[7rem] flex-1 flex-col gap-1">
                <label htmlFor={`${idPrefix}-${index}-${kolom.key}`} className="text-xs text-muted-foreground">
                  {kolom.label}
                </label>
                <VeldInputEnkel
                  id={`${idPrefix}-${index}-${kolom.key}`}
                  veld={kolom}
                  waarde={regel[kolom.key]}
                  onChange={(w) => updateRegel(index, kolom.key, w)}
                />
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleVerwijderKlik(index)}
            aria-label="Regel verwijderen"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={voegRegelToe} className="self-start">
        <Plus className="h-4 w-4" />
        {veld.toevoegLabel}
      </Button>

      <ConfirmDialog
        open={pendingVerwijderIndex != null}
        onClose={() => setPendingVerwijderIndex(null)}
        onConfirm={() => {
          if (pendingVerwijderIndex != null) verwijderRegel(pendingVerwijderIndex);
          setPendingVerwijderIndex(null);
        }}
        title="Regel verwijderen?"
        description="De ingevulde waarden voor deze regel gaan verloren."
      />
    </div>
  );
}
