"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { brandingSchema } from "@/app/lib/validation";
import { uploadFoto, deleteFoto, isUploadedFile } from "@/app/lib/storage";
import { effectiveTier } from "@/app/lib/subscription";

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
  const magPersonaliserenUiterlijk = effectiveTier(user) !== "GRATIS";

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
