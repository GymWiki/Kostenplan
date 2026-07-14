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
    // app/lib/actions/auth.ts). This is a fallback for accounts that ended up
    // in Supabase Auth without one (e.g. created directly in the dashboard).
    const email = authUser.email ?? "";
    const bedrijfsnaam =
      (authUser.user_metadata?.bedrijfsnaam as string | undefined) ||
      email.split("@")[0] ||
      "Mijn bedrijf";
    const slug = await generateUniqueSlug(bedrijfsnaam);

    return prisma.user.create({
      data: {
        id: authUser.id,
        email,
        bedrijfsnaam,
        slug,
        costSettings: { create: {} },
      },
    });
  }
);

export async function requireUser() {
  const authUser = await verifySupabaseUser();
  return ensureProfile(authUser);
}

export async function getArbeidStapEenheid(userId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { userId },
    select: { arbeidStapEenheid: true },
  });
  return costSettings?.arbeidStapEenheid ?? "UUR";
}

// Cost-settings fields the product form needs to decide whether to show
// per-product override inputs, and what default/fallback values to display.
export async function getProductPricingSettings(userId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { userId },
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
