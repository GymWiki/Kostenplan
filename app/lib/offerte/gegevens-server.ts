import "server-only";
import { prisma } from "@/app/lib/prisma";
import type { Company } from "@/app/generated/prisma/client";
import {
  STANDAARD_HERROEPINGSTEKST,
  STANDAARD_INTRO,
  STANDAARD_KOR_TEKST,
  STANDAARD_SLOT,
  STANDAARD_VOORWAARDEN_BLOKKEN,
  termijnenVoor,
  type BetaalTermijn,
  type OfferteGegevensWaarden,
  type VoorwaardenBlok,
} from "./gegevens";
import type { RegelSoort } from "./btw-config";
import { STANDAARD_DEELTEKST, STANDAARD_HERINNERINGSTEKST } from "./berichten";

// Laadt de offertegegevens van een bedrijf, aangevuld met wat we al weten
// (handelsnaam, KvK, adres, logo, e-mail, telefoon) zodat het formulier
// vooringevuld is.
export async function laadOfferteGegevens(company: Pick<Company, "id" | "naam" | "kvkNummer" | "adres" | "createdBy">): Promise<OfferteGegevensWaarden> {
  const [rij, tool, maker] = await Promise.all([
    prisma.offerteGegevens.findUnique({ where: { companyId: company.id } }),
    prisma.tool.findFirst({ where: { companyId: company.id, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { branding: { select: { logoUrl: true, telefoonnummer: true } } } }),
    prisma.user.findUnique({ where: { id: company.createdBy }, select: { email: true } }),
  ]);
  const s = (v: string | null | undefined) => v ?? "";
  const blokken = (rij?.voorwaardenBlokken as VoorwaardenBlok[] | null) ?? STANDAARD_VOORWAARDEN_BLOKKEN;
  const eigen = (rij?.betaalTermijnen as BetaalTermijn[] | null) ?? null;
  return {
    handelsnaam: s(rij?.handelsnaam) || company.naam,
    rechtsvorm: rij?.rechtsvorm ?? "EENMANSZAAK",
    statutaireNaam: s(rij?.statutaireNaam),
    statutaireZetel: s(rij?.statutaireZetel),
    kvkNummer: s(rij?.kvkNummer) || s(company.kvkNummer),
    adresRegel: s(rij?.adresRegel) || s(company.adres),
    postcode: s(rij?.postcode),
    plaats: s(rij?.plaats),
    btwId: s(rij?.btwId),
    korActief: rij?.korActief ?? false,
    korTekst: rij?.korTekst ?? STANDAARD_KOR_TEKST,
    iban: s(rij?.iban),
    ibanTenaamstelling: s(rij?.ibanTenaamstelling),
    telefoon: s(rij?.telefoon) || s(tool?.branding?.telefoonnummer),
    email: s(rij?.email) || s(maker?.email),
    website: s(rij?.website),
    logoUrl: s(rij?.logoUrl) || s(tool?.branding?.logoUrl),
    contactNaam: s(rij?.contactNaam),
    contactFunctie: s(rij?.contactFunctie),
    voorwaardenPdfUrl: s(rij?.voorwaardenPdfUrl),
    voorwaardenPdfNaam: s(rij?.voorwaardenPdfNaam),
    nummerPrefix: s(rij?.nummerPrefix),
    geldigheidDagen: rij?.geldigheidDagen ?? 30,
    betaalPreset: rij?.betaalPreset ?? "NA_OPLEVERING",
    betaalTermijnen: rij?.betaalPreset === "EIGEN" ? eigen : termijnenVoor(rij?.betaalPreset ?? "NA_OPLEVERING", null),
    introTekst: s(rij?.introTekst) || STANDAARD_INTRO,
    slotTekst: s(rij?.slotTekst) || STANDAARD_SLOT,
    voorwaardenBlokken: blokken,
    herroepingTekst: s(rij?.herroepingTekst) || STANDAARD_HERROEPINGSTEKST,
    btwStandaard: (rij?.btwStandaard as Partial<Record<RegelSoort, number>> | null) ?? null,
    deelTekst: s(rij?.deelTekst) || STANDAARD_DEELTEKST,
    herinneringTekst: s(rij?.herinneringTekst) || STANDAARD_HERINNERINGSTEKST,
  };
}
