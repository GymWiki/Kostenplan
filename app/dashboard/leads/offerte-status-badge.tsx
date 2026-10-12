import { Badge } from "@/app/components/ui/badge";
import { OFFERTE_STATUS_LABELS, weergaveOfferteStatus } from "@/app/lib/offertes";
import { leadOfferteStatus } from "@/app/lib/offerte/lead-status";
import type { OfferteStatus, OfferteV2Status } from "@/app/generated/prisma/client";

const VARIANT: Record<string, "default" | "success" | "warning" | "outline" | "muted"> = {
  concept: "muted",
  verstuurd: "default",
  bekeken: "default",
  geaccepteerd: "success",
  afgewezen: "warning",
  verlopen: "outline",
  ingetrokken: "outline",
};

// Label van de offertestatus bij een lead, voor nieuwe (v2: ook "Bekeken") en oude offertes.
export function OfferteStatusBadge({ offerte }: { offerte: { status: OfferteStatus; geldigTot: Date; v2Status?: OfferteV2Status } }) {
  if (offerte.v2Status) {
    const s = leadOfferteStatus({ offerte });
    return <Badge variant={VARIANT[s.sleutel] ?? "muted"}>{s.label}</Badge>;
  }
  const status = weergaveOfferteStatus(offerte);
  return <Badge variant={VARIANT[status.toLowerCase()] ?? "muted"}>{OFFERTE_STATUS_LABELS[status]}</Badge>;
}
