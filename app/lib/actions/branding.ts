"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { brandingSchema, subscriptionTierSchema } from "@/app/lib/validation";
import { uploadFoto, deleteFoto, isUploadedFile } from "@/app/lib/storage";

export type BrandingFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

async function resolveLogo(
  userId: string,
  formData: FormData,
  currentLogo: string | null
): Promise<{ logoUrl: string | null; error?: undefined } | { logoUrl?: undefined; error: string }> {
  const file = formData.get("logo");
  if (isUploadedFile(file)) {
    const result = await uploadFoto(userId, file);
    if (typeof result.url !== "string") return { error: result.error };
    if (currentLogo) await deleteFoto(currentLogo);
    return { logoUrl: result.url };
  }
  if (formData.get("verwijderLogo") === "on" && currentLogo) {
    await deleteFoto(currentLogo);
    return { logoUrl: null };
  }
  return { logoUrl: currentLogo };
}

export async function updateBrandingAction(
  _prevState: BrandingFormState,
  formData: FormData
): Promise<BrandingFormState> {
  const user = await requireUser();

  const parsed = brandingSchema.safeParse({
    primaireKleur: formData.get("primaireKleur"),
    achtergrondKleur: formData.get("achtergrondKleur"),
    lettertype: formData.get("lettertype"),
    customTitel: formData.get("customTitel") ?? "",
    welkomstTekst: formData.get("welkomstTekst") ?? "",
    bedankTekst: formData.get("bedankTekst"),
    toonTelefoonnummer: formData.get("toonTelefoonnummer") === "on",
    telefoonnummer: formData.get("telefoonnummer") ?? "",
    toonEmail: formData.get("toonEmail") === "on",
    contactPositie: formData.get("contactPositie"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const existing = await prisma.branding.findUnique({ where: { userId: user.id } });

  const logoResult = await resolveLogo(user.id, formData, existing?.logoUrl ?? null);
  if (logoResult.error) {
    return { error: logoResult.error };
  }

  // Kleuren en lettertype zijn een Plus/Pro-feature — nooit vertrouwen op
  // wat de client meestuurt. Bij Gratis worden deze velden simpelweg niet
  // meegenomen in de update, zodat ze op hun (standaard)waarde blijven staan.
  const magPersonaliserenUiterlijk = user.subscriptionTier !== "GRATIS";

  const data = {
    logoUrl: logoResult.logoUrl,
    customTitel: parsed.data.customTitel || null,
    welkomstTekst: parsed.data.welkomstTekst || null,
    bedankTekst: parsed.data.bedankTekst,
    toonTelefoonnummer: parsed.data.toonTelefoonnummer,
    telefoonnummer: parsed.data.telefoonnummer || null,
    toonEmail: parsed.data.toonEmail,
    contactPositie: parsed.data.contactPositie,
    ...(magPersonaliserenUiterlijk
      ? { primaireKleur: parsed.data.primaireKleur, achtergrondKleur: parsed.data.achtergrondKleur, lettertype: parsed.data.lettertype }
      : {}),
  };

  await prisma.branding.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/dashboard/branding");
  revalidatePath(`/portaal/${user.slug}`);

  return { success: true };
}

export type SubscriptionFormState = { error?: string } | null;

// Tijdelijke, zelf-instelbare abonnementskeuze zonder echte betaling — er is
// nog geen betaalprovider gekoppeld. Zodra die er is, vervangt een webhook
// (bijv. na een geslaagde Stripe-checkout) deze server action.
export async function updateSubscriptionTierAction(
  _prevState: SubscriptionFormState,
  formData: FormData
): Promise<SubscriptionFormState> {
  const user = await requireUser();

  const parsed = subscriptionTierSchema.safeParse({
    subscriptionTier: formData.get("subscriptionTier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionTier: parsed.data.subscriptionTier },
  });

  revalidatePath("/dashboard/branding");
  revalidatePath(`/portaal/${user.slug}`);

  return null;
}
