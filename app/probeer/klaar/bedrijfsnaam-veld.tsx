"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { wijzigBedrijfsnaamAction } from "@/app/lib/actions/gast-account";

export function BedrijfsnaamVeld({ start }: { start: string }) {
  const [naam, setNaam] = useState(start);
  const [status, setStatus] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const r = await wijzigBedrijfsnaamAction(naam);
    setBezig(false);
    setStatus(r.ok ? { ok: true, tekst: "Opgeslagen." } : { ok: false, tekst: r.error ?? "Opslaan lukte niet." });
  }

  return (
    <form onSubmit={opslaan} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Field label="Naam van je bedrijf" htmlFor="bedrijfsnaam" hint="We hebben deze van je website gehaald. Pas hem aan als dat nodig is.">
        <Input id="bedrijfsnaam" value={naam} maxLength={80} onChange={(e) => setNaam(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11" disabled={bezig}>
          {bezig ? "Opslaan…" : "Naam opslaan"}
        </Button>
        <p role="status" aria-live="polite" className={status?.ok === false ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
          {status?.tekst}
        </p>
      </div>
    </form>
  );
}
