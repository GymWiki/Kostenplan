"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { getBaseUrl } from "@/app/lib/url";
import { beperk } from "@/app/lib/rate-limit";
import { GAST_BEWIJS_COOKIE, ipHash } from "@/app/lib/gast";
import { logGastGebeurtenis } from "@/app/lib/gast-log";
import { controleerGastBewijs, gastOvernameActief, maakGastBewijs } from "@/app/lib/gast-token";
import { canCreateTool, requireActiveCompany, requireVolledigAccount, verifySupabaseUser } from "@/app/lib/dal";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { generateUniqueToolSlug } from "@/app/lib/slug";
import { z } from "zod";

export type KoppelState = { verzonden?: boolean; bestaat?: boolean; email?: string; error?: string } | null;

const emailSchema = z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in");

// Wie een gast is, krijgt een kort bewijs (httpOnly cookie) mee: na het
// inloggen op een bestaand account is de gast-sessie weg, maar met dit bewijs
// kunnen we het voorbeeld alsnog aan dat account hangen.
async function zetGastBewijs(userId: string) {
  if (!gastOvernameActief()) return;
  const company = await prisma.company.findFirst({ where: { createdBy: userId, gastVerlooptOp: { not: null } }, select: { id: true } });
  if (!company) return;
  const store = await cookies();
  store.set(GAST_BEWIJS_COOKIE, maakGastBewijs({ gastUserId: userId, companyId: company.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

async function gastUser() {
  const authUser = await verifySupabaseUser();
  if (authUser.is_anonymous !== true) redirect("/dashboard");
  return authUser;
}

// "Doorgaan met Google": koppelt Google aan de gast (zelfde user-id, alles blijft).
export async function koppelGoogleAction() {
  const user = await gastUser();
  await zetGastBewijs(user.id);
  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: `${baseUrl}/auth/callback?next=/probeer/klaar&via=google` },
  });
  if (error || !data?.url) redirect("/probeer/editor?paneel=account&fout=google");
  redirect(data.url);
}

// E-mail koppelen (magic link). `later`: de "stuur mij een link"-variant.
export async function koppelEmailAction(_prev: KoppelState, formData: FormData): Promise<KoppelState> {
  const user = await gastUser();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vul een geldig e-mailadres in" };
  const email = parsed.data;

  const limiet = await beperk(`gast-mail:${ipHash(await headers())}`, 5, 3600);
  if (!limiet.toegestaan) return { error: "Je hebt al een paar links aangevraagd. Probeer het over een uur opnieuw." };

  await zetGastBewijs(user.id);
  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${baseUrl}/auth/callback?next=/probeer/klaar&via=email` });
  if (error) {
    if (error.code === "email_exists" || error.code === "identity_already_exists" || /already (been )?registered|already exists/i.test(error.message)) {
      return { bestaat: true, email };
    }
    console.error("Gast e-mail koppelen mislukt", error);
    return { error: "We konden geen link versturen. Controleer het adres en probeer het opnieuw." };
  }
  if (formData.get("later") === "1") await logGastGebeurtenis("link_gemaild", { userId: user.id });
  return { verzonden: true, email };
}

// Bestaat het adres al: inloggen en dit voorbeeld toevoegen aan dat account.
// De link komt na het inloggen uit op /probeer/overnemen.
export async function inloggenVoorOvernameAction(_prev: KoppelState, formData: FormData): Promise<KoppelState> {
  await gastUser();
  if (!gastOvernameActief()) return { error: "Dit is nu niet beschikbaar. Log gewoon in." };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vul een geldig e-mailadres in" };
  const limiet = await beperk(`gast-mail:${ipHash(await headers())}`, 5, 3600);
  if (!limiet.toegestaan) return { error: "Je hebt al een paar links aangevraagd. Probeer het over een uur opnieuw." };
  const baseUrl = await getBaseUrl();
  const captchaToken = String(formData.get("captchaToken") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${baseUrl}/auth/callback?next=/probeer/overnemen`, ...(captchaToken ? { captchaToken } : {}) },
  });
  if (error) return { error: "We konden geen inloglink versturen. Probeer het opnieuw." };
  return { verzonden: true, email: parsed.data };
}

export async function inloggenMetGoogleVoorOvernameAction() {
  await gastUser();
  if (!gastOvernameActief()) redirect("/login");
  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${baseUrl}/auth/callback?next=/probeer/overnemen` },
  });
  if (error || !data.url) redirect("/probeer/editor?paneel=account&fout=google");
  redirect(data.url);
}

export async function wijzigBedrijfsnaamAction(naam: string): Promise<{ ok: boolean; error?: string }> {
  await requireVolledigAccount();
  const { company } = await requireActiveCompany();
  const schoon = naam.trim();
  if (schoon.length < 2 || schoon.length > 80) return { ok: false, error: "Geef een naam van 2 tot 80 tekens." };
  await prisma.company.update({ where: { id: company.id }, data: { naam: schoon } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export type OvernameState = { error?: string } | null;

// "Dit voorbeeld toevoegen aan je account": verplaatst de rekentool van het
// gast-bedrijf naar het (actieve) bedrijf van het bestaande account. Nooit
// stilletjes overschrijven: dit gebeurt alleen na een expliciete bevestiging,
// en alleen als het abonnement ruimte heeft.
export async function neemVoorbeeldOverAction(_prev: OvernameState, _formData: FormData): Promise<OvernameState> {
  await requireVolledigAccount();
  const store = await cookies();
  const bewijs = controleerGastBewijs(store.get(GAST_BEWIJS_COOKIE)?.value);
  if (!bewijs) return { error: "Dit voorbeeld kunnen we niet meer terugvinden. Maak gerust een nieuwe." };

  const gastCompany = await prisma.company.findFirst({
    where: { id: bewijs.companyId, createdBy: bewijs.gastUserId, gastVerlooptOp: { not: null } },
    include: { tools: { where: { deletedAt: null }, include: { _count: { select: { products: true } } } } },
  });
  const tool = gastCompany?.tools[0];
  if (!gastCompany || !tool) return { error: "Dit voorbeeld bestaat niet meer. Maak gerust een nieuwe." };

  const { user, company } = await requireActiveCompany();
  const tier = effectiveTier(company);
  if (!(await canCreateTool(company.id, tier))) {
    return { error: `Je account zit al aan het maximum aantal rekentools voor je pakket (${PLAN_LIMITS[tier].maxActiveTools}). Gooi het voorbeeld weg of upgrade eerst.` };
  }
  const limiet = PLAN_LIMITS[tier].maxProductsPerCompany;
  if (limiet !== null) {
    const bestaand = await prisma.product.count({ where: { tool: { companyId: company.id } } });
    if (bestaand + tool._count.products > limiet) {
      return { error: `Samen komt dat boven het maximum van ${limiet} onderdelen voor je pakket. Gooi het voorbeeld weg of upgrade eerst.` };
    }
  }

  await prisma.tool.update({
    where: { id: tool.id },
    data: { companyId: company.id, slug: await generateUniqueToolSlug(company.id, tool.naam), status: "CONCEPT", order: await prisma.tool.count({ where: { companyId: company.id } }) },
  });
  await prisma.company.delete({ where: { id: gastCompany.id } });
  await logGastGebeurtenis("account_gemaakt_email", { userId: bewijs.gastUserId });
  store.delete(GAST_BEWIJS_COOKIE);
  void user;
  revalidatePath("/dashboard/tools");
  redirect(`/dashboard/tools/${tool.id}`);
}

export async function gooiVoorbeeldWegAction() {
  await requireVolledigAccount();
  // Het voorbeeld verdwijnt vanzelf bij de dagelijkse opruiming (inclusief logo's).
  (await cookies()).delete(GAST_BEWIJS_COOKIE);
  redirect("/dashboard");
}
