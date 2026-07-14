"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireActiveCompany, ACTIEF_BEDRIJF_COOKIE } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getMollieClient } from "@/app/lib/mollie";
import { generateUniqueSlug } from "@/app/lib/slug";
import {
  companySchema,
  companyDetailsSchema,
  deleteCompanySchema,
} from "@/app/lib/validation";

export type CompanyFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

async function setActiefBedrijfCookie(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIEF_BEDRIJF_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Bewust GEEN kopieerfunctie van producten/diensten tussen bedrijven — een
// nieuw bedrijf start met een lege catalogus en doorloopt dezelfde
// onboarding-checklist als een gloednieuwe gebruiker. Zie Fase 1-analyse
// voor de onderbouwing; een kopieerfunctie is een mogelijke vervolgfeature.
export async function createCompanyAction(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireUser();

  const parsed = companySchema.safeParse({ naam: formData.get("naam") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const slug = await generateUniqueSlug(parsed.data.naam);

  const company = await prisma.company.create({
    data: {
      naam: parsed.data.naam,
      slug,
      createdBy: user.id,
      costSettings: { create: {} },
      members: { create: { userId: user.id, rol: "owner" } },
    },
  });

  // Meteen naar het nieuwe bedrijf schakelen, zodat de gebruiker na het
  // aanmaken direct in de (lege) context van dat bedrijf terechtkomt.
  await setActiefBedrijfCookie(company.id);
  redirect("/dashboard");
}

// Interne bestemmingen na het wisselen van bedrijf — bewust een allowlist
// (geen vrije "redirectTo" string doorgeven aan redirect()) zodat dit nooit
// een open redirect kan worden, ook al komt de waarde vandaag alleen van
// een hidden field dat wijzelf renderen.
const SWITCH_REDIRECT_TARGETS = {
  dashboard: "/dashboard",
  abonnement: "/dashboard/abonnement",
  branding: "/dashboard/branding",
} as const;

// Aangeroepen vanuit de bedrijfsswitcher ("Openen") en de profielpagina
// ("Upgraden/Downgraden" schakelt eerst naar dat bedrijf en gaat dan naar
// de abonnementpagina, die altijd over het actieve bedrijf gaat). Valideert
// dat companyId een echt lidmaatschap van de ingelogde gebruiker is
// voordat de cookie wordt gezet, zodat een vervalste waarde nooit toegang
// tot andermans bedrijf kan geven (requireActiveCompany() zou zo'n waarde
// toch negeren, maar dit voorkomt een overbodige round-trip met een cookie
// die nooit ergens toe leidt).
export async function switchActiveCompanyAction(formData: FormData) {
  const { user } = await requireActiveCompany();
  const companyId = formData.get("companyId");
  if (typeof companyId !== "string") return;

  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId },
    select: { companyId: true },
  });
  if (!membership) return;

  await setActiefBedrijfCookie(membership.companyId);

  const redirectKey = formData.get("redirectTo");
  const target =
    typeof redirectKey === "string" && redirectKey in SWITCH_REDIRECT_TARGETS
      ? SWITCH_REDIRECT_TARGETS[redirectKey as keyof typeof SWITCH_REDIRECT_TARGETS]
      : SWITCH_REDIRECT_TARGETS.dashboard;
  redirect(target);
}

async function requireMembership(companyId: string) {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId },
    select: { companyId: true },
  });
  if (!membership) return null;
  return user;
}

// Bedrijfsgegevens (naam, KvK, adres) — huisstijl/logo/offerte-instellingen
// blijven op de bestaande Branding-pagina (die altijd over het actieve
// bedrijf gaat, zie "Bewerk huisstijl" op de profielpagina).
export async function updateCompanyDetailsAction(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireMembership(companyId);
  if (!user) return { error: "Bedrijf niet gevonden" };

  const parsed = companyDetailsSchema.safeParse({
    naam: formData.get("naam"),
    kvkNummer: formData.get("kvkNummer") ?? "",
    adres: formData.get("adres") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      naam: parsed.data.naam,
      kvkNummer: parsed.data.kvkNummer || null,
      adres: parsed.data.adres || null,
    },
  });

  revalidatePath("/dashboard/profiel");
  return { error: undefined };
}

// Zelfde downgrade-gedrag als startCheckoutAction(plan=GRATIS) in
// subscription.ts — direct opzeggen bij Mollie, niet uitgesteld tot het
// einde van de betaalperiode (ongewijzigd overgenomen, zie Fase 4). Los
// gehouden van startCheckoutAction omdat dit een expliciet gekozen
// (mogelijk niet-actief) bedrijf betreft, niet per se het actieve bedrijf.
export async function cancelSubscriptionAction(
  companyId: string,
  _prevState: CompanyFormState
): Promise<CompanyFormState> {
  const user = await requireMembership(companyId);
  if (!user) return { error: "Bedrijf niet gevonden" };

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { mollieSubscriptionId: true, mollieCustomerId: true },
  });

  if (company.mollieSubscriptionId && company.mollieCustomerId) {
    const mollie = getMollieClient();
    await mollie.customerSubscriptions.cancel(company.mollieSubscriptionId, {
      customerId: company.mollieCustomerId,
    });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionTier: "GRATIS",
      subscriptionStatus: company.mollieSubscriptionId ? "CANCELED" : "GEEN",
    },
  });

  revalidatePath("/dashboard/profiel");
  return null;
}

// Alleen mogelijk zonder lopend (actief/wachtend/opgeschort) abonnement en
// nooit voor iemands laatste bedrijf — requireActiveCompany() verwacht dat
// elke gebruiker er altijd minstens één heeft. Dubbele bevestiging (naam
// exact intypen) wordt hier server-side herhaald, niet alleen client-side,
// omdat alle bijbehorende data (catalogus, leads, instellingen) onomkeerbaar
// verdwijnt via de cascade-relaties in het schema.
export async function deleteCompanyAction(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireMembership(companyId);
  if (!user) return { error: "Bedrijf niet gevonden" };

  const [company, membershipCount] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { naam: true, subscriptionStatus: true },
    }),
    prisma.companyMember.count({ where: { userId: user.id } }),
  ]);

  if (membershipCount <= 1) {
    return { error: "Je kunt je enige bedrijf niet verwijderen." };
  }
  if (!["GEEN", "CANCELED", "COMPLETED"].includes(company.subscriptionStatus)) {
    return { error: "Zeg eerst het abonnement op voordat je dit bedrijf verwijdert." };
  }

  const parsed = deleteCompanySchema.safeParse({
    bevestigingsNaam: formData.get("bevestigingsNaam"),
  });
  if (!parsed.success || parsed.data.bevestigingsNaam !== company.naam) {
    return { error: `Typ de naam "${company.naam}" exact over om te bevestigen.` };
  }

  await prisma.company.delete({ where: { id: companyId } });

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIEF_BEDRIJF_COOKIE)?.value === companyId) {
    cookieStore.delete(ACTIEF_BEDRIJF_COOKIE);
  }

  redirect("/dashboard/profiel");
}
