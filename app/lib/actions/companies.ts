"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, requireActiveCompany, ACTIEF_BEDRIJF_COOKIE } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { generateUniqueSlug } from "@/app/lib/slug";
import { companySchema } from "@/app/lib/validation";

export type CompanyFormState = { error?: string; fieldErrors?: Record<string, string> } | null;

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
  const cookieStore = await cookies();
  cookieStore.set(ACTIEF_BEDRIJF_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

// Aangeroepen vanuit de bedrijfsswitcher — alleen zichtbaar/bruikbaar bij 2+
// bedrijven. Valideert dat companyId een echt lidmaatschap van de ingelogde
// gebruiker is voordat de cookie wordt gezet, zodat een vervalste waarde
// nooit toegang tot andermans bedrijf kan geven (requireActiveCompany()
// zou zo'n waarde toch negeren, maar dit voorkomt een overbodige round-trip
// met een cookie die nooit ergens toe leidt).
export async function switchActiveCompanyAction(formData: FormData) {
  const { user } = await requireActiveCompany();
  const companyId = formData.get("companyId");
  if (typeof companyId !== "string") return;

  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId },
    select: { companyId: true },
  });
  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIEF_BEDRIJF_COOKIE, membership.companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
