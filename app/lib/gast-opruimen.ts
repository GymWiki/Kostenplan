import { GAST_BEWAAR_DAGEN } from "@/app/lib/gast";

// Opruimen van gast-voorbeelden die niet tot een account zijn gemaakt. De
// afhankelijkheden zijn injecteerbaar zodat de regels te testen zijn zonder
// database. Een gekoppeld account is geen anonieme gebruiker meer en komt
// hier dus nooit langs.
export type OpruimAfhankelijkheden = {
  // Anonieme gebruikers (auth.users.is_anonymous) aangemaakt vóór `grens`.
  zoekVerlopenGasten(grens: Date): Promise<string[]>;
  // Gast-bedrijven (gastVerlooptOp gezet) van deze gebruiker.
  bedrijvenVan(userId: string): Promise<{ id: string }[]>;
  verwijderBestanden(companyId: string): Promise<number>;
  verwijderBedrijf(companyId: string): Promise<void>;
  verwijderGebruiker(userId: string): Promise<void>;
};

export type OpruimResultaat = { gasten: number; bedrijven: number; bestanden: number; fouten: string[] };

export async function ruimGastenOp(deps: OpruimAfhankelijkheden, nu = new Date()): Promise<OpruimResultaat> {
  const grens = new Date(nu.getTime() - GAST_BEWAAR_DAGEN * 24 * 60 * 60 * 1000);
  const resultaat: OpruimResultaat = { gasten: 0, bedrijven: 0, bestanden: 0, fouten: [] };

  for (const userId of await deps.zoekVerlopenGasten(grens)) {
    try {
      for (const bedrijf of await deps.bedrijvenVan(userId)) {
        // Eerst de bestanden: lukt dat niet, dan blijft alles staan en probeert
        // de volgende run het opnieuw (geen losse bestanden zonder eigenaar).
        resultaat.bestanden += await deps.verwijderBestanden(bedrijf.id);
        await deps.verwijderBedrijf(bedrijf.id);
        resultaat.bedrijven += 1;
      }
      await deps.verwijderGebruiker(userId);
      resultaat.gasten += 1;
    } catch (error) {
      resultaat.fouten.push(`${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return resultaat;
}
