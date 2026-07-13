"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { extraOptionSchema } from "@/app/lib/validation";
import { uploadFoto, deleteFoto } from "@/app/lib/storage";

export type ExtraOptionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseExtraOptionForm(formData: FormData) {
  return extraOptionSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    prijs: formData.get("prijs"),
    type: formData.get("type") || "PER_EENHEID",
    actief: formData.get("actief") === "on" || formData.get("actief") === "true",
  });
}

// Uploads a replacement photo if one was picked, or clears the existing
// photo if "verwijderFoto" was checked. Returns the value to store in the
// foto column, or an error message if the upload failed.
async function resolveFoto(
  userId: string,
  formData: FormData,
  currentFoto: string | null
): Promise<{ foto: string | null; error?: undefined } | { foto?: undefined; error: string }> {
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    const result = await uploadFoto(userId, file);
    if (typeof result.url !== "string") return { error: result.error };
    if (currentFoto) await deleteFoto(currentFoto);
    return { foto: result.url };
  }
  if (formData.get("verwijderFoto") === "on" && currentFoto) {
    await deleteFoto(currentFoto);
    return { foto: null };
  }
  return { foto: currentFoto };
}

export async function createExtraOptionAction(
  productId: string,
  _prevState: ExtraOptionFormState,
  formData: FormData
): Promise<ExtraOptionFormState> {
  const user = await requireUser();

  const parsed = parseExtraOptionForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
  });
  if (!product) {
    return { error: "Product niet gevonden" };
  }

  const fotoResult = await resolveFoto(user.id, formData, null);
  if (fotoResult.error) {
    return { error: fotoResult.error };
  }

  const count = await prisma.extraOption.count({ where: { productId } });

  await prisma.extraOption.create({
    data: { ...parsed.data, foto: fotoResult.foto, productId, order: count },
  });

  revalidatePath(`/dashboard/producten/${productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function updateExtraOptionAction(
  extraOptionId: string,
  _prevState: ExtraOptionFormState,
  formData: FormData
): Promise<ExtraOptionFormState> {
  const user = await requireUser();

  const parsed = parseExtraOptionForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const option = await prisma.extraOption.findFirst({
    where: { id: extraOptionId, product: { userId: user.id } },
  });
  if (!option) {
    return { error: "Extra optie niet gevonden" };
  }

  const fotoResult = await resolveFoto(user.id, formData, option.foto);
  if (fotoResult.error) {
    return { error: fotoResult.error };
  }

  await prisma.extraOption.update({
    where: { id: extraOptionId },
    data: { ...parsed.data, foto: fotoResult.foto },
  });

  revalidatePath(`/dashboard/producten/${option.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function deleteExtraOptionAction(formData: FormData) {
  const user = await requireUser();
  const extraOptionId = formData.get("extraOptionId");
  if (typeof extraOptionId !== "string") return;

  const option = await prisma.extraOption.findFirst({
    where: { id: extraOptionId, product: { userId: user.id } },
  });
  if (!option) return;

  await prisma.extraOption.delete({ where: { id: extraOptionId } });
  if (option.foto) await deleteFoto(option.foto);

  revalidatePath(`/dashboard/producten/${option.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}

export async function toggleExtraOptionActiveAction(formData: FormData) {
  const user = await requireUser();
  const extraOptionId = formData.get("extraOptionId");
  const actief = formData.get("actief") === "true";
  if (typeof extraOptionId !== "string") return;

  const option = await prisma.extraOption.findFirst({
    where: { id: extraOptionId, product: { userId: user.id } },
  });
  if (!option) return;

  await prisma.extraOption.update({
    where: { id: extraOptionId },
    data: { actief: !actief },
  });

  revalidatePath(`/dashboard/producten/${option.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}
