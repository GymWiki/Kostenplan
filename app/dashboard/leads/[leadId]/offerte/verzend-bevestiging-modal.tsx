"use client";

import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { formatCurrency } from "@/app/lib/format";
import { berekenVerzendControles, type OfferteRegel } from "@/app/lib/offertes";

// Deel 3: laatste-moment-controle vlak vóór versturen — klantnaam,
// e-mailadres en totaalbedrag ter verificatie, plus de automatische checks
// (zie berekenVerzendControles in app/lib/offertes.ts). Eén blokkerende
// controle (ontbrekend e-mailadres) sluit "Versturen" volledig af, de rest
// zijn waarschuwingen die de vakman bewust moet zien voordat hij doorgaat.
export function VerzendBevestigingModal({
  open,
  onClose,
  onBevestig,
  pending,
  klantNaam,
  klantEmail,
  regels,
  totaal,
  geldigTot,
}: {
  open: boolean;
  onClose: () => void;
  onBevestig: () => void;
  pending: boolean;
  klantNaam: string;
  klantEmail: string;
  regels: OfferteRegel[];
  totaal: number;
  geldigTot: Date | null;
}) {
  if (!open) return null;

  const { blokkerend, waarschuwingen } = berekenVerzendControles({
    klantEmail,
    regels,
    totaal,
    geldigTot: geldigTot ?? new Date(),
  });
  const heeftMeldingen = blokkerend.length > 0 || waarschuwingen.length > 0;

  return (
    <Overlay
      open={open}
      onClose={onClose}
      ariaLabelledBy="verzend-bevestiging-titel"
      className="flex items-center justify-center p-4"
    >
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 id="verzend-bevestiging-titel" className="text-lg font-semibold text-foreground">
          Offerte versturen?
        </h2>

        <div className="flex flex-col text-sm">
          <Rij label="Klant" waarde={klantNaam || "—"} />
          <Rij label="E-mailadres" waarde={klantEmail || "—"} />
          <Rij label="Totaalbedrag" waarde={formatCurrency(totaal)} laatste />
        </div>

        {blokkerend.map((controle) => (
          <p
            key={controle.type}
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {controle.bericht}
          </p>
        ))}
        {waarschuwingen.map((controle) => (
          <p key={controle.type} className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {controle.bericht}
          </p>
        ))}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            size="lg"
            className="w-full sm:flex-1"
            disabled={pending || blokkerend.length > 0}
            onClick={onBevestig}
          >
            {pending ? "Bezig…" : heeftMeldingen ? "Toch versturen" : "Versturen"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full sm:flex-1"
            disabled={pending}
            onClick={onClose}
          >
            Annuleren
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function Rij({ label, waarde, laatste = false }: { label: string; waarde: string; laatste?: boolean }) {
  return (
    <div
      className={
        laatste
          ? "flex items-center justify-between py-1.5"
          : "flex items-center justify-between border-b border-dashed border-border py-1.5"
      }
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{waarde}</span>
    </div>
  );
}
