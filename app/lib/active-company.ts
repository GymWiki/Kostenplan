// Losstaand van dal.ts (dat "server-only"/next/headers importeert) zodat
// deze puur functionele kernlogica zonder Next.js-requestcontext getest kan
// worden — zie active-company.test.ts.

// Kiest het bedrijf uit een lijst lidmaatschappen aan de hand van een
// (mogelijk ontbrekende of vervalste) cookie-waarde: een match op
// companyId wint, anders het eerste lidmaatschap in de meegegeven
// volgorde (requireActiveCompany() in dal.ts sorteert op createdAt asc,
// dus dat is het oudste bedrijf). Een cookie die niet overeenkomt met een
// echt lidmaatschap van deze gebruiker (vervalst, verlopen, of van een
// inmiddels verwijderd bedrijf) wordt hiermee altijd genegeerd.
export function resolveActiveMembership<T extends { companyId: string }>(
  memberships: T[],
  gekozenCompanyId: string | undefined
): T {
  if (memberships.length === 0) {
    throw new Error("resolveActiveMembership: memberships mag niet leeg zijn");
  }
  return memberships.find((m) => m.companyId === gekozenCompanyId) ?? memberships[0];
}
