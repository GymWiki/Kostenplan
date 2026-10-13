import { MapPin } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { LeadSnapshot } from "@/app/lib/leads";
import { afstandTekst, leadMarkeringen, MARKERING_LABELS, type MarkeringSoort } from "@/app/lib/werkgebied/lead-markeringen";

const KLEUR: Record<MarkeringSoort, string> = {
  BUITEN_WERKGEBIED: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  ONDER_MINIMUM: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  WERKGEBIED_NIET_GECONTROLEERD: "bg-secondary text-foreground",
};

// Labels en afstand van een lead (werkgebied en minimum). Rendert niets als de rekentool die niet gebruikt.
export function LocatieLabels({ snapshot, metAfstand = true, className }: { snapshot: LeadSnapshot; metAfstand?: boolean; className?: string }) {
  const markeringen = leadMarkeringen(snapshot);
  const afstand = metAfstand ? afstandTekst(snapshot) : null;
  if (markeringen.length === 0 && !afstand) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {markeringen.map((m) => (
        <span key={m} className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", KLEUR[m])}>
          {MARKERING_LABELS[m]}
        </span>
      ))}
      {afstand && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {afstand}
        </span>
      )}
    </span>
  );
}
