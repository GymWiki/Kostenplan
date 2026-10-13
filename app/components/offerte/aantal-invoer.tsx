"use client";

import { useState } from "react";
import { parseGetal } from "@/app/lib/getal";
import { formatAantal } from "@/app/lib/offerte/weergave";

// Aantal rechtstreeks in het document. Ongeldige tekst zet het aantal niet stilzwijgend
// op 0: de vorige geldige waarde blijft en onder het veld staat een melding.
export function AantalInvoer({ aantal, onChange }: { aantal: number; onChange: (n: number) => void }) {
  const [tekst, setTekst] = useState<string | null>(null);
  const [fout, setFout] = useState<string | undefined>();
  return (
    <>
      <input
        className="og-invoer r"
        inputMode="decimal"
        autoComplete="off"
        aria-label="Aantal"
        aria-invalid={fout ? true : undefined}
        value={tekst ?? formatAantal(aantal)}
        onChange={(e) => {
          setTekst(e.target.value);
          if (e.target.value.trim() === "") return setFout(undefined);
          const r = parseGetal(e.target.value, { soort: "aantal", max: 10_000_000 });
          if (r.ok) {
            setFout(undefined);
            onChange(r.waarde);
          } else setFout(r.fout);
        }}
        onBlur={() => {
          if (tekst !== null && tekst.trim() === "") setFout("Vul een aantal in.");
          else if (!fout) setTekst(null);
        }}
        style={{ textAlign: "right" }}
      />
      {fout && (
        <span role="alert" style={{ display: "block", color: "#b91c1c", fontSize: "11px", textAlign: "right" }}>
          {fout}
        </span>
      )}
    </>
  );
}
