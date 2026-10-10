import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { AutosaveStatus } from "./use-autosave";

// Statusindicator voor automatisch opslaan: "Opslaan…" / "Alles opgeslagen",
// en bij een fout een duidelijke melding met opnieuw-proberen.
export function OpslaanStatus({
  status,
  ongeldig,
  fout,
  onOpnieuw,
}: {
  status: AutosaveStatus;
  // Er staan nog ongeldige velden: er wordt niets opgeslagen tot die kloppen.
  ongeldig: boolean;
  fout: string | null;
  onOpnieuw: () => void;
}) {
  if (status === "fout") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1 font-medium">Opslaan is niet gelukt. {fout}</span>
        <Button type="button" size="sm" variant="outline" onClick={onOpnieuw}>
          Opnieuw proberen
        </Button>
      </div>
    );
  }
  if (ongeldig) {
    return (
      <span role="status" className="flex items-center gap-1.5 text-sm font-medium text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Nog niet opgeslagen: vul de rode velden in
      </span>
    );
  }
  if (status === "opslaan" || status === "wijzigingen") {
    return (
      <span role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Opslaan…
      </span>
    );
  }
  return (
    <span role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      Alles opgeslagen
    </span>
  );
}
