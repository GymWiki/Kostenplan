"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { valideerFormaat, type OfferteGegevensWaarden } from "@/app/lib/offerte/gegevens";
import { formatteerIban, normaliseerBtwId, normaliseerKvk, normaliseerPostcode } from "@/app/lib/offerte/validatie";
import { isUploadedFile, MAX_VOORWAARDEN_BYTES, uploadVoorwaardenPdf } from "@/app/lib/storage";

export type GegevensResultaat = { ok: true; gegevens: OfferteGegevensWaarden } | { ok: false; fouten: Record<string, string>; error?: string };

// Slaat (een deel van) de offertegegevens op. Leeg laten mag: de controle voor
// versturen gebeurt pas bij "Controleren en versturen". Ingevulde velden moeten
// wel een geldig formaat hebben.
export async function saveOfferteGegevensAction(invoer: Partial<OfferteGegevensWaarden>): Promise<GegevensResultaat> {
  const { company } = await requireActiveCompany();
  const fouten = valideerFormaat(invoer);
  if (Object.keys(fouten).length > 0) return { ok: false, fouten };

  const t = (v: string | undefined) => (v === undefined ? undefined : v.trim());
  const data = {
    handelsnaam: t(invoer.handelsnaam),
    rechtsvorm: invoer.rechtsvorm,
    statutaireNaam: t(invoer.statutaireNaam),
    statutaireZetel: t(invoer.statutaireZetel),
    kvkNummer: invoer.kvkNummer === undefined ? undefined : normaliseerKvk(invoer.kvkNummer),
    adresRegel: t(invoer.adresRegel),
    postcode: invoer.postcode === undefined ? undefined : normaliseerPostcode(invoer.postcode),
    plaats: t(invoer.plaats),
    btwId: invoer.btwId === undefined ? undefined : normaliseerBtwId(invoer.btwId),
    korActief: invoer.korActief,
    korTekst: t(invoer.korTekst),
    iban: invoer.iban === undefined ? undefined : invoer.iban.trim() ? formatteerIban(invoer.iban) : "",
    ibanTenaamstelling: t(invoer.ibanTenaamstelling),
    telefoon: t(invoer.telefoon),
    email: t(invoer.email),
    website: t(invoer.website),
    logoUrl: t(invoer.logoUrl),
    contactNaam: t(invoer.contactNaam),
    contactFunctie: t(invoer.contactFunctie),
    nummerPrefix: t(invoer.nummerPrefix)?.replace(/[^A-Za-z0-9-]/g, "").slice(0, 10),
    geldigheidDagen: invoer.geldigheidDagen,
    betaalPreset: invoer.betaalPreset,
    betaalTermijnen: invoer.betaalTermijnen === undefined ? undefined : (invoer.betaalTermijnen ?? undefined),
    introTekst: t(invoer.introTekst),
    slotTekst: t(invoer.slotTekst),
    voorwaardenBlokken: invoer.voorwaardenBlokken,
    herroepingTekst: t(invoer.herroepingTekst),
    btwStandaard: invoer.btwStandaard === undefined ? undefined : (invoer.btwStandaard ?? undefined),
    deelTekst: t(invoer.deelTekst),
    herinneringTekst: t(invoer.herinneringTekst),
  };
  // Lege tekst betekent "terug naar standaard" voor de lange teksten en de KOR-tekst.
  const schoon = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  await prisma.offerteGegevens.upsert({ where: { companyId: company.id }, create: { companyId: company.id, ...schoon }, update: schoon });
  revalidatePath("/dashboard/profiel");
  return { ok: true, gegevens: await laadOfferteGegevens(company) };
}

export async function uploadVoorwaardenAction(formData: FormData): Promise<{ ok: true; url: string; naam: string } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const bestand = formData.get("bestand");
  if (!isUploadedFile(bestand)) return { ok: false, error: "Kies een PDF-bestand." };
  if (bestand.type !== "application/pdf" && !bestand.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Alleen PDF-bestanden kunnen worden geüpload." };
  if (bestand.size > MAX_VOORWAARDEN_BYTES) return { ok: false, error: "Het bestand is te groot (maximaal 10 MB)." };
  const buffer = Buffer.from(await bestand.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return { ok: false, error: "Dit lijkt geen geldig PDF-bestand." };
  const r = await uploadVoorwaardenPdf(company.id, buffer);
  if (!r.url) return { ok: false, error: r.error ?? "Uploaden is mislukt." };
  await prisma.offerteGegevens.upsert({
    where: { companyId: company.id },
    create: { companyId: company.id, voorwaardenPdfUrl: r.url as string, voorwaardenPdfNaam: bestand.name },
    update: { voorwaardenPdfUrl: r.url, voorwaardenPdfNaam: bestand.name },
  });
  revalidatePath("/dashboard/profiel");
  return { ok: true, url: r.url, naam: bestand.name };
}

export async function verwijderVoorwaardenAction(): Promise<{ ok: true }> {
  const { company } = await requireActiveCompany();
  await prisma.offerteGegevens.updateMany({ where: { companyId: company.id }, data: { voorwaardenPdfUrl: null, voorwaardenPdfNaam: null } });
  revalidatePath("/dashboard/profiel");
  return { ok: true };
}
