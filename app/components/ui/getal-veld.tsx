"use client";

import { useState } from "react";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { formatBedragInvoer, formatGetalInvoer, parseBedrag, parseGetal } from "@/app/lib/getal";

// Gedeelde velden voor bedragen (in centen) en hoeveelheden. Zolang je typt blijft
// je eigen tekst staan; een geldige waarde gaat meteen door naar `onChange`, een
// ongeldige niet: de vorige geldige waarde blijft staan en onder het veld staat
// een Nederlandse melding. Bij het verlaten van een geldig veld wordt de tekst
// opgemaakt (altijd met komma).

const MAX_BEDRAG_CENTEN = 10_000_000_00;
const MAX_AANTAL = 10_000_000;

export function BedragVeld({
  id,
  label,
  centen,
  onChange,
  hint,
  negatief = false,
  maxCenten = MAX_BEDRAG_CENTEN,
}: {
  id: string;
  label: string;
  centen: number;
  onChange: (c: number) => void;
  hint?: string;
  negatief?: boolean;
  maxCenten?: number;
}) {
  const [typen, setTypen] = useState<string | null>(null);
  const [fout, setFout] = useState<string | undefined>();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={fout}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground" aria-hidden="true">
          €
        </span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={fout ? true : undefined}
          aria-describedby={fout ? `${id}-fout` : undefined}
          value={typen ?? formatBedragInvoer(centen)}
          onChange={(e) => {
            const tekst = e.target.value;
            setTypen(tekst);
            if (tekst.trim() === "") return setFout(undefined);
            const r = parseBedrag(tekst, { negatief, maxCenten });
            if (r.ok) {
              setFout(undefined);
              onChange(r.centen);
            } else setFout(r.fout);
          }}
          onBlur={() => {
            if (typen === null) return;
            if (typen.trim() === "") setFout("Vul een bedrag in.");
            else if (!fout) setTypen(null);
          }}
        />
      </div>
    </Field>
  );
}

export function GetalVeld({
  id,
  label,
  waarde,
  onChange,
  hint,
  min,
  max = MAX_AANTAL,
  negatief = false,
  geheel = false,
}: {
  id: string;
  label: string;
  waarde: number;
  onChange: (n: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  negatief?: boolean;
  geheel?: boolean;
}) {
  const [typen, setTypen] = useState<string | null>(null);
  const [fout, setFout] = useState<string | undefined>();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={fout}>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={fout ? true : undefined}
        aria-describedby={fout ? `${id}-fout` : undefined}
        value={typen ?? formatGetalInvoer(waarde)}
        onChange={(e) => {
          const tekst = e.target.value;
          setTypen(tekst);
          if (tekst.trim() === "") return setFout(undefined);
          const r = parseGetal(tekst, { soort: "aantal", negatief, min, max });
          if (r.ok && geheel && !Number.isInteger(r.waarde)) setFout("Vul een heel getal in, zonder decimalen.");
          else if (r.ok) {
            setFout(undefined);
            onChange(r.waarde);
          } else setFout(r.fout);
        }}
        onBlur={() => {
          if (typen === null) return;
          if (typen.trim() === "") setFout("Vul een getal in.");
          else if (!fout) setTypen(null);
        }}
      />
    </Field>
  );
}
