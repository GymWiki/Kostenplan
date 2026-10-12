"use client";

import { useActiefVeldZichtbaar } from "./use-mobiel";

// Globale mobiele gedragingen: het actieve veld scrollt boven het toetsenbord uit.
export function MobielBasis() {
  useActiefVeldZichtbaar();
  return null;
}
