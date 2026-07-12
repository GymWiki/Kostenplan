import type { ArbeidStapEenheid } from "@/app/generated/prisma/client";

export const ARBEID_EENHEID_LABELS: Record<
  ArbeidStapEenheid,
  { enkelvoud: string; meervoud: string }
> = {
  UUR: { enkelvoud: "uur", meervoud: "uren" },
  DAGDEEL: { enkelvoud: "dagdeel", meervoud: "dagdelen" },
  DAG: { enkelvoud: "dag", meervoud: "dagen" },
};

export function arbeidEenheidEnkelvoud(eenheid: ArbeidStapEenheid) {
  return ARBEID_EENHEID_LABELS[eenheid].enkelvoud;
}

export function arbeidEenheidMeervoud(eenheid: ArbeidStapEenheid) {
  return ARBEID_EENHEID_LABELS[eenheid].meervoud;
}
