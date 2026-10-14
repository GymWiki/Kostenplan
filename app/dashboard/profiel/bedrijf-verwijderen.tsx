"use client";

import { useActionState, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { deleteCompanyAction, type CompanyFormState } from "@/app/lib/actions/companies";

// Alleen getoond bij meer dan één bedrijf. Een rode tekstregel; tikken opent de bevestiging in de pagina.
export function BedrijfVerwijderen({ company, abonnementLoopt, facturen = { aantal: 0, geexporteerd: true } }: { company: { id: string; naam: string }; abonnementLoopt: boolean; facturen?: { aantal: number; geexporteerd: boolean } }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const action = deleteCompanyAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, null);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full cursor-pointer items-center rounded-xl px-4 text-left text-base font-medium text-destructive hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
      >
        Bedrijf verwijderen
      </button>
      {open && (
        <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-foreground">
            Dit verwijdert <strong>{company.naam}</strong> definitief, met alle rekentools, leads en offertes. Dit kan niet ongedaan worden gemaakt.
          </p>
          <p className="text-foreground">
            {abonnementLoopt
              ? "Het abonnement van dit bedrijf loopt nog. Zeg het eerst op via Profiel → Abonnement; daarna kun je het bedrijf verwijderen."
              : "Er loopt geen abonnement meer voor dit bedrijf, dus je betaalt er na het verwijderen niets meer voor."}
          </p>
          {facturen.aantal > 0 && (
            <p className="rounded-lg border border-border bg-card p-3 text-foreground">
              Dit bedrijf heeft <strong>{facturen.aantal} {facturen.aantal === 1 ? "factuur" : "facturen"}</strong>. Facturen moet je 7 jaar bewaren.{" "}
              {facturen.geexporteerd ? "Je hebt de export gedownload; bewaar die goed." : "Download eerst de volledige export (ZIP met alle PDF's en een CSV), anders kun je het bedrijf niet verwijderen. Ververs daarna deze pagina."}{" "}
              <a className="font-semibold underline" href="/api/facturen/export?formaat=zip&ubl=1" download>
                Export van alle facturen downloaden
              </a>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bevestig-${company.id}`}>Typ “{company.naam}” ter bevestiging</Label>
            <Input id={`bevestig-${company.id}`} name="bevestigingsNaam" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
          {state?.error && <p role="alert" className="text-destructive">{state.error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" variant="destructive" disabled={typed !== company.naam || pending || abonnementLoopt}>
              {pending ? "Bezig…" : "Definitief verwijderen"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
