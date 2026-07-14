import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { generateUniqueSlug } from "@/app/lib/slug";

export const verifySupabaseUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
});

// Cached per request: the dashboard layout and every nested dashboard page
// each call requireUser() independently, so without this every single
// dashboard page load would re-query the User row from Postgres twice (once
// for the layout, once for the page) instead of once. Relies on
// verifySupabaseUser() above also being cached and returning the same
// object reference within a request, which is what cache() dedupes on.
const ensureProfile = cache(
  async (authUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }) => {
    const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (existing) return existing;

    // Profile rows are normally created during sign-up (see
    // app/lib/actions/auth.ts, which also creates the user's first Company).
    // This is a fallback for accounts that ended up in Supabase Auth without
    // one (e.g. created directly in the dashboard) — it creates both the
    // User and their first Company, exactly like registerAction does.
    const email = authUser.email ?? "";
    const bedrijfsnaam =
      (authUser.user_metadata?.bedrijfsnaam as string | undefined) ||
      email.split("@")[0] ||
      "Mijn bedrijf";

    return createUserWithFirstCompany(authUser.id, email, bedrijfsnaam);
  }
);

// Aangeroepen vanuit registerAction (bij sign-up) en de ensureProfile-
// fallback hierboven — beide gevallen maken een gloednieuwe User aan die nog
// geen enkel bedrijf heeft, dus krijgen ze meteen hun eerste (owner)
// Company, inclusief lege CostSettings zodat de rekentool direct werkt.
export async function createUserWithFirstCompany(
  userId: string,
  email: string,
  bedrijfsnaam: string
) {
  const slug = await generateUniqueSlug(bedrijfsnaam);

  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      companyMemberships: {
        create: {
          rol: "owner",
          company: {
            create: {
              naam: bedrijfsnaam,
              slug,
              createdBy: userId,
              costSettings: { create: {} },
            },
          },
        },
      },
    },
    update: {},
  });
}

export async function requireUser() {
  const authUser = await verifySupabaseUser();
  return ensureProfile(authUser);
}

// Het bedrijf waarvan de ingelogde gebruiker momenteel de data ziet. Kiest
// vandaag altijd het oudste (eerste) lidmaatschap — voor bestaande,
// gemigreerde gebruikers is dat hun oorspronkelijke, automatisch aangemaakte
// bedrijf, dus dit levert exact hetzelfde gedrag op als vóór multi-company.
// Een echte "actief bedrijf"-keuze (bij 2+ bedrijven) komt in een latere
// fase (bedrijfsswitcher).
export const requireActiveCompany = cache(async () => {
  const user = await requireUser();
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  // Kan zich in de praktijk niet voordoen: elke User krijgt bij aanmaak
  // (registerAction / createUserWithFirstCompany) meteen een eerste Company.
  if (!membership) {
    throw new Error(`Gebruiker ${user.id} heeft geen enkel bedrijf — dit hoort nooit voor te komen.`);
  }

  return { user, company: membership.company };
});

export async function getArbeidStapEenheid(companyId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { companyId },
    select: { arbeidStapEenheid: true },
  });
  return costSettings?.arbeidStapEenheid ?? "UUR";
}

// Cost-settings fields the product form needs to decide whether to show
// per-product override inputs, and what default/fallback values to display.
export async function getProductPricingSettings(companyId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { companyId },
    select: {
      arbeidStapEenheid: true,
      arbeidTarief: true,
      arbeidTariefPerProduct: true,
      materiaalMarge: true,
      materiaalMargePerProduct: true,
    },
  });
  return (
    costSettings ?? {
      arbeidStapEenheid: "UUR" as const,
      arbeidTarief: 45,
      arbeidTariefPerProduct: false,
      materiaalMarge: 0,
      materiaalMargePerProduct: false,
    }
  );
}
