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

async function ensureProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
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

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return ensureProfile(user);
});

export async function requireUser() {
  const authUser = await verifySupabaseUser();
  return ensureProfile(authUser);
}
