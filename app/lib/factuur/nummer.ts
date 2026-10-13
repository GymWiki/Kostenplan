// Factuurnummer: <prefix><jaar>-<volgnummer, 4 cijfers>, bijv. F2026-0001 of C2026-0003. Een creditnota heeft een eigen
// reeks (eigen prefix en teller) en verwijst naar de oorspronkelijke factuur.
export function formatteerFactuurNummer(prefix: string, jaar: number, volgnummer: number): string {
  return `${prefix.trim()}${jaar}-${String(volgnummer).padStart(4, "0")}`;
}

type RawClient = { $queryRaw: (strings: TemplateStringsArray, ...waarden: unknown[]) => Promise<unknown> };

// Het volgende nummer van een reeks. Moet binnen dezelfde transactie draaien als het definitief maken van de factuur:
// slaat die transactie af, dan wordt de teller ook teruggedraaid (geen gat), en een tweede gelijktijdige transactie
// wacht op de rij-lock tot de eerste klaar is (nooit twee keer hetzelfde nummer).
export async function volgendeFactuurNummer(tx: RawClient, companyId: string, reeks: string, prefix: string, jaar: number): Promise<{ nummer: string; volgnummer: number }> {
  const rijen = (await tx.$queryRaw`
    INSERT INTO "FactuurNummerTeller" ("companyId", "reeks", "jaar", "laatste")
    VALUES (${companyId}, ${reeks}, ${jaar}, 1)
    ON CONFLICT ("companyId", "reeks", "jaar") DO UPDATE SET "laatste" = "FactuurNummerTeller"."laatste" + 1
    RETURNING "laatste"
  `) as { laatste: number }[];
  const volgnummer = Number(rijen[0].laatste);
  return { nummer: formatteerFactuurNummer(prefix, jaar, volgnummer), volgnummer };
}
