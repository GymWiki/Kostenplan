"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { offerteUpdateSchema, offerteReactieSchema, externAfgehandeldNotitieSchema } from "@/app/lib/validation";
import { genereerEnUploadOffertePdf } from "@/app/lib/offerte-pdf";
import { prefillOfferteRegels, type OfferteRegel } from "@/app/lib/offertes";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { Offerte } from "@/app/generated/prisma/client";

export type OfferteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

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

  // Gerichte uitzondering op de verder losstaande LeadStatus/OfferteStatus:
  // komt de vakman via dit pad terug van "ik verstuur zelf" (Deel 1), dan
  // klopt "extern afgehandeld" niet meer — er wordt nu juist een offerte in
  // Kostenplan gemaakt/bewerkt. Ongeacht of er al een offerte bestond.
  if (lead.status === "EXTERN_AFGEHANDELD") {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "IN_BEHANDELING" } });
  }

  if (!lead.offerte) {
    const branding = await prisma.branding.findUnique({ where: { toolId: lead.toolId } });
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

// Bewaart het concept — mag ongeacht de status, behalve zodra de klant al
// akkoord is: een geaccepteerde offerte is het bewijsstuk van wat er is
// afgesproken en mag daarna nooit meer wijzigen, ook niet door de vakman
// zelf. Dit is een harde regel op actie-niveau — de editor-UI toont
// daarnaast een banner en zet zichzelf read-only, maar dat is een tweede
// laag, niet de enige laag.
export async function saveOfferteAction(
  offerteId: string,
  _prevState: OfferteFormState,
  formData: FormData
): Promise<OfferteFormState> {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte) return { error: "Offerte niet gevonden" };
  if (offerte.status === "GEACCEPTEERD") {
    return { error: "Deze offerte is al geaccepteerd door de klant en kan niet meer worden gewijzigd." };
  }

  const parsed = parseOfferteFormData(formData);
  if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

  await prisma.offerte.update({
    where: { id: offerteId },
    data: parsed.data,
  });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
  revalidatePath("/dashboard/leads");
  return { success: true };
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
  if (offerte.status === "GEACCEPTEERD") {
    return { error: "Deze offerte is al geaccepteerd door de klant en kan niet meer worden gewijzigd." };
  }

  const parsed = parseOfferteFormData(formData);
  if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: offerte.leadId } });
  const [branding, costSettings] = await Promise.all([
    prisma.branding.findUnique({ where: { toolId: lead.toolId } }),
    prisma.costSettings.findUnique({
      where: { toolId: lead.toolId },
      select: { gebruiktAccountBtw: true, btwPercentage: true },
    }),
  ]);
  const effectieveBtw = costSettings
    ? costSettings.gebruiktAccountBtw
      ? company.standaardBtwPercentage
      : costSettings.btwPercentage
    : company.standaardBtwPercentage;

  // Achtervang naast de client-side verzend-bevestiging (zie berekenVerzend
  // Controles in app/lib/offertes.ts) — Lead.email is al verplicht bij het
  // aanmaken van een aanvraag, dit vangt alleen het randgeval af.
  if (!lead.email.trim()) {
    return { error: "De klant heeft geen e-mailadres — versturen is niet mogelijk." };
  }

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
      btwPercentage: effectieveBtw,
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

// Herberekent de regels van een concept vanuit de bevroren aanvraag-
// snapshot, met de huidige (gefixte) logica — voor concepten die zijn
// voorgevuld tegen een oudere snapshot zonder prijs per productregel (zie
// heeftVerouderdeBerekening in app/lib/offertes.ts). Bewust geen stille
// automatische herberekening: de vakman ziet expliciet een melding en klikt
// zelf op "Opnieuw berekenen" — dezelfde reden waarom "genereer offerte om
// te delen" ook nooit ongevraagd bedragen wijzigt. Alleen voor CONCEPT: een
// al verzonden of definitieve offerte wordt hier nooit met terugwerkende
// kracht door aangepast. Geeft de nieuwe regels terug zodat de editor zijn
// client-side bewerkstate kan bijwerken — revalidatePath alleen is hier niet
// genoeg, regels leven in useState, niet rechtstreeks in props.
export async function herberekenOfferteAction(offerteId: string): Promise<OfferteRegel[] | null> {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte || offerte.status !== "CONCEPT") return null;

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: offerte.leadId } });
  const regels = prefillOfferteRegels(lead.snapshot as unknown as LeadSnapshot);

  await prisma.offerte.update({ where: { id: offerteId }, data: { regels } });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
  revalidatePath("/dashboard/leads");
  return regels;
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

// Trekt een verzonden offerte in — een zachte statuswijziging, geen
// verwijdering: de rij en de historie blijven bestaan, alleen de publieke
// link toont voortaan "niet meer beschikbaar" (zie de INGETROKKEN-tak in
// offerte-presentatie.tsx). Alleen mogelijk vanuit VERSTUURD — een
// geaccepteerde offerte trek je niet in (die is het bewijsstuk van wat is
// afgesproken), en een concept heeft nog geen publieke link om in te
// trekken. Opnieuw versturen is geen aparte actie: nog een keer op
// "Genereer offerte om te delen" klikken zet de status terug naar VERSTUURD
// op dezelfde link.
export async function intrekOfferteAction(offerteId: string) {
  const { company } = await requireActiveCompany();
  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte || offerte.status !== "VERSTUURD") return;

  await prisma.offerte.update({
    where: { id: offerteId },
    data: { status: "INGETROKKEN", ingetrokkenOp: new Date() },
  });

  revalidatePath(`/dashboard/leads/${offerte.leadId}/offerte`);
  revalidatePath("/dashboard/leads");
}

// Hard verwijderen — anders dan intrekken hierboven bestaat de rij daarna
// niet meer. Alleen voor een CONCEPT: die heeft nooit een publieke link
// gehad (geen deelToken) en is dus nooit door de klant gezien, in
// tegenstelling tot een verzonden offerte (die je intrekt, niet verwijdert).
export async function deleteOfferteAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const offerteId = formData.get("offerteId");
  if (typeof offerteId !== "string") return;

  const offerte = await requireOfferteOwnership(offerteId, company.id);
  if (!offerte || offerte.status !== "CONCEPT") return;

  await prisma.offerte.delete({ where: { id: offerteId } });

  revalidatePath("/dashboard/leads");
  redirect("/dashboard/leads");
}

// Deel 1: de vakman kiest om deze aanvraag zelf, buiten Kostenplan om, af te
// handelen. Zet alleen Lead.status + tijdstip (+ optionele notitie) — een
// eventueel bestaande offerte wordt hier nooit verwijderd of aangepast, die
// blijft gewoon bestaan en door de vakman bekijkbaar, maar is vanaf nu niet
// meer bereikbaar voor de klant (zie de check op lead.status in
// app/offerte/[token]/page.tsx). Omgekeerd (alsnog "in Kostenplan"): zie de
// reset in omzettenNaarOfferteAction hierboven.
export async function markExternAfgehandeldAction(leadId: string, notitie: string) {
  const { company } = await requireActiveCompany();
  const parsed = externAfgehandeldNotitieSchema.safeParse({ notitie });

  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: company.id }, select: { id: true } });
  if (!lead) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: "EXTERN_AFGEHANDELD",
      externAfgehandeldOp: new Date(),
      externAfgehandeldNotitie: (parsed.success && parsed.data.notitie) || null,
    },
  });

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
