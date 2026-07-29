"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { offerteUpdateSchema, offerteReactieSchema } from "@/app/lib/validation";
import { genereerEnUploadOffertePdf } from "@/app/lib/offerte-pdf";
import { prefillOfferteRegels } from "@/app/lib/offertes";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { Offerte } from "@/app/generated/prisma/client";

export type OfferteFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

async function requireOfferteOwnership(offerteId: string, companyId: string) {
  return prisma.offerte.findFirst({
    where: { id: offerteId, lead: { companyId } },
  });
}

// "Omzetten naar offerte"-actie vanuit de aanvragenpagina. Idempotent — als
// er al een offerteconcept bestaat voor deze aanvraag wordt dat gewoon
// hergebruikt (dezelfde knop dient dus ook als "bekijk offerte"), in plaats
// van dat elke klik een nieuwe rij zou maken.
export async function omzettenNaarOfferteAction(leadId: string) {
  const { company } = await requireActiveCompany();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: company.id },
    include: { offerte: true },
  });
  if (!lead) redirect("/dashboard/leads");

  if (!lead.offerte) {
    const branding = await prisma.branding.findUnique({ where: { companyId: company.id } });
    const geldigheidsdagen = branding?.offerteGeldigheidsdagen ?? 30;
    const geldigTot = new Date();
    geldigTot.setDate(geldigTot.getDate() + geldigheidsdagen);

    await prisma.offerte.create({
      data: {
        leadId,
        regels: prefillOfferteRegels(lead.snapshot as unknown as LeadSnapshot),
        introTekst: branding?.offerteIntroTekst ?? null,
        voorwaardenTekst: branding?.offerteVoorwaardenTekst ?? null,
        geldigTot,
      },
    });

    revalidatePath("/dashboard/leads");
  }

  redirect(`/dashboard/leads/${leadId}/offerte`);
}

type ParsedOfferteFormData =
  | {
      success: true;
      data: {
        regels: { id: string; omschrijving: string; aantal: number; eenheid: string; prijsPerEenheid: number }[];
        introTekst: string | null;
        voorwaardenTekst: string | null;
        geldigTot: Date;
      };
    }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function parseOfferteFormData(formData: FormData): ParsedOfferteFormData {
  let regelsJson: unknown;
  try {
    regelsJson = JSON.parse(String(formData.get("regels") ?? "[]"));
  } catch {
    return { success: false, error: "Ongeldige regels. Ververs de pagina en probeer het opnieuw." };
  }

  const parsed = offerteUpdateSchema.safeParse({
    regels: regelsJson,
    introTekst: formData.get("introTekst") ?? "",
    voorwaardenTekst: formData.get("voorwaardenTekst") ?? "",
    geldigTot: formData.get("geldigTot"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { success: false, error: "Controleer de gemarkeerde velden.", fieldErrors };
  }

  const geldigTot = new Date(parsed.data.geldigTot);
  if (Number.isNaN(geldigTot.getTime())) {
    return { success: false, error: "Ongeldige geldigheidsdatum." };
  }

  return {
    success: true,
    data: {
      regels: parsed.data.regels,
      introTekst: parsed.data.introTekst || null,
      voorwaardenTekst: parsed.data.voorwaardenTekst || null,
      geldigTot,
    },
  };
}

// Bewaart het concept — mag ongeacht de huidige status, ook nadat er al
// gedeeld is (de vakman is eigenaar van de inhoud; het publieke adres blijft
// gewoon hetzelfde totdat er expliciet een nieuwe link wordt aangevraagd).
export async function saveOfferteAction(
  offerteId: string,
  _prevState: OfferteFormState,
  formData: FormData
): Promise<OfferteFormState> {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte) return { error: "Offerte niet gevonden" };

  const parsed = parseOfferteFormData(formData);
  if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

  await prisma.offerte.update({
    where: { id: offerteId },
    data: parsed.data,
  });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
  revalidatePath("/dashboard/leads");
  return { error: undefined };
}

// Het enige pad waarlangs een offerte de deur uit gaat — nooit automatisch.
// Bewaart eerst de huidige formulierinhoud (zelfde als saveOfferteAction),
// genereert daarna pas (als dat nog niet eerder gebeurde) een deelToken en
// altijd een verse PDF, en zet status op VERSTUURD.
export async function genereerDeelLinkAction(
  offerteId: string,
  _prevState: OfferteFormState,
  formData: FormData
): Promise<OfferteFormState> {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte) return { error: "Offerte niet gevonden" };

  const parsed = parseOfferteFormData(formData);
  if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

  const [lead, branding, costSettings] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id: offerte.leadId } }),
    prisma.branding.findUnique({ where: { companyId: company.id } }),
    prisma.costSettings.findUnique({ where: { companyId: company.id }, select: { btwPercentage: true } }),
  ]);

  const deelToken = offerte.deelToken ?? crypto.randomUUID();

  let pdfUrl: string | null = offerte.pdfUrl;
  try {
    pdfUrl = await genereerEnUploadOffertePdf({
      companyId: company.id,
      offerteId,
      regels: parsed.data.regels,
      introTekst: parsed.data.introTekst,
      voorwaardenTekst: parsed.data.voorwaardenTekst,
      geldigTot: parsed.data.geldigTot,
      btwPercentage: costSettings?.btwPercentage ?? 21,
      bedrijfsnaam: company.naam,
      klantNaam: lead.naam,
      branding,
    });
  } catch (error) {
    console.error("Offerte-PDF genereren mislukt:", error);
    // Delen mag ook zonder PDF door blijven gaan — de publieke link zelf
    // toont de offerte sowieso, de PDF is een extra downloadoptie.
  }

  await prisma.offerte.update({
    where: { id: offerteId },
    data: {
      ...parsed.data,
      status: "VERSTUURD",
      deelToken,
      pdfUrl,
      verstuurdOp: offerte.verstuurdOp ?? new Date(),
    },
  });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
  revalidatePath("/dashboard/leads");
  return { error: undefined };
}

// Rotatie van de publieke link (zie Security-eis: alleen de eigenaar-vakman
// mag dit) — de oude link stopt meteen met werken, de offerte-inhoud zelf
// blijft ongewijzigd.
export async function regenereerDeelLinkAction(offerteId: string) {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte) return;

  await prisma.offerte.update({
    where: { id: offerteId },
    data: { deelToken: crypto.randomUUID() },
  });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
}

// Zet reactieGezien terug op true zodra de vakman de offerte weer opent —
// zie de in-app melding op de aanvragenpagina.
export async function markOffertReactieGezienAction(offerteId: string) {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte || offerte.reactieGezien) return;

  await prisma.offerte.update({ where: { id: offerteId }, data: { reactieGezien: true } });
  revalidatePath("/dashboard/leads");
}

// Lazy verval-check — wordt aangeroepen op de momenten die ertoe doen (de
// publieke pagina openen, de concept-editor openen), niet bij elke
// kanban-render. Zie weergaveOfferteStatus() in app/lib/offertes.ts voor de
// puur-berekende variant die wél overal (incl. lijsten) gebruikt wordt.
export async function syncOfferteVerval(offerte: Offerte): Promise<Offerte> {
  if (offerte.status !== "VERSTUURD" || offerte.geldigTot.getTime() >= Date.now()) {
    return offerte;
  }
  return prisma.offerte.update({ where: { id: offerte.id }, data: { status: "VERLOPEN" } });
}

export type PubliekeReactieState = { error?: string } | null;

// Publiek, geen auth — vindbaar/bereikbaar via het niet-raadbare deelToken.
// Reageert alleen op een offerte die daadwerkelijk VERSTUURD is (niet nog
// concept, niet al beantwoord, niet verlopen), dus dubbel-klikken of een
// verlopen link kan de eerdere beslissing nooit overschrijven.
export async function reageerOpOfferteAction(
  deelToken: string,
  _prevState: PubliekeReactieState,
  formData: FormData
): Promise<PubliekeReactieState> {
  const parsed = offerteReactieSchema.safeParse({
    beslissing: formData.get("beslissing"),
    opmerking: formData.get("opmerking") ?? "",
  });
  if (!parsed.success) return { error: "Ongeldige keuze." };

  const offerte = await prisma.offerte.findUnique({ where: { deelToken } });
  if (!offerte) return { error: "Offerte niet gevonden." };

  const actueel = await syncOfferteVerval(offerte);
  if (actueel.status !== "VERSTUURD") {
    return { error: "Op deze offerte is al gereageerd, of hij is niet meer geldig." };
  }

  await prisma.offerte.update({
    where: { id: offerte.id },
    data: {
      status: parsed.data.beslissing,
      gereageerdOp: new Date(),
      klantReactie: parsed.data.opmerking || null,
      reactieGezien: false,
    },
  });

  revalidatePath(`/offerte/${deelToken}`);
  revalidatePath("/dashboard/leads");
  return { error: undefined };
}
