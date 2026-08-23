import { AlertTriangle, Check, Circle } from "lucide-react";
import { cn } from "@/app/lib/cn";

// ✓ Klaar / ⚠ Actie nodig / ○ Concept (Deel 12 van de UI/UX-herontwerp-
// opdracht) — een oogopslag-status per Onderdeel/Vraag/Prijsregel, los van
// de bestaande Actief/Uit-badge: "Actief" zegt alleen of iets meetelt in de
// berekening, "Klaar"/"Actie nodig" zegt of het ook daadwerkelijk werkt.
export type BouwerStatus = "klaar" | "actie-nodig" | "concept";

const STATUS_CONFIG: Record<
  BouwerStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; className: string }
> = {
  klaar: { icon: Check, label: "Klaar", className: "text-primary" },
  "actie-nodig": { icon: AlertTriangle, label: "Actie nodig", className: "text-warning" },
  concept: { icon: Circle, label: "Concept", className: "text-muted-foreground" },
};

export function StatusIndicator({ status, className }: { status: BouwerStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
