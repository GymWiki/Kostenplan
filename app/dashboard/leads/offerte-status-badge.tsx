import { Badge } from "@/app/components/ui/badge";
import { OFFERTE_STATUS_LABELS, weergaveOfferteStatus } from "@/app/lib/offertes";
import type { OfferteStatus } from "@/app/generated/prisma/client";

const VARIANT_BY_STATUS: Record<OfferteStatus, "default" | "success" | "warning" | "outline" | "muted"> = {
  CONCEPT: "muted",
  VERSTUURD: "default",
  GEACCEPTEERD: "success",
  AFGEWEZEN: "warning",
  VERLOPEN: "outline",
};

export function OfferteStatusBadge({ offerte }: { offerte: { status: OfferteStatus; geldigTot: Date } }) {
  const status = weergaveOfferteStatus(offerte);
  return <Badge variant={VARIANT_BY_STATUS[status]}>{OFFERTE_STATUS_LABELS[status]}</Badge>;
}
