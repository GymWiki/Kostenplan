import type { FactuurStatus } from "@/app/generated/prisma/client";

// De status zoals hij in de kop van een factuur staat: altijd de echte stand, nooit een vaste tekst.
// "Verstuurd op <datum>" verschijnt pas nadat de gebruiker bevestigd heeft dat hij is verstuurd.
export function factuurStatusKop(f: { status: FactuurStatus; verstuurdOp?: string | Date | null; dagenTeLaat?: number | null }): { tekst: string; toon: "neutraal" | "goed" | "let-op" } {
  if ((f.status === "VERSTUURD" || f.status === "DEELS_BETAALD") && f.dagenTeLaat && f.dagenTeLaat > 0) return { tekst: "Te laat", toon: "let-op" };
  switch (f.status) {
    case "CONCEPT":
      return { tekst: "Concept", toon: "neutraal" };
    case "DEFINITIEF":
      return { tekst: "Definitief – nog niet verstuurd", toon: "let-op" };
    case "VERSTUURD": {
      if (!f.verstuurdOp) return { tekst: "Verstuurd", toon: "goed" };
      const d = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(f.verstuurdOp));
      return { tekst: `Verstuurd op ${d}`, toon: "goed" };
    }
    case "DEELS_BETAALD":
      return { tekst: "Deels betaald", toon: "goed" };
    case "BETAALD":
      return { tekst: "Betaald", toon: "goed" };
    case "GECREDITEERD":
      return { tekst: "Gecrediteerd", toon: "neutraal" };
  }
}
