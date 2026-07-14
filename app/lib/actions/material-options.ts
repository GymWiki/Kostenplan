"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { materialOptionSchema } from "@/app/lib/validation";
import { uploadFoto, deleteFoto, isUploadedFile } from "@/app/lib/storage";

export type MaterialOptionFormState = { error?: string } | null;

function parseMaterialOptionForm(formData: FormData) {
  return materialOptionSchema.safeParse({
    naam: formData.get("naam"),
    prijs: formData.get("prijs"),
    prijsType: formData.get("prijsType") || "VAST",
    prijsMin: formData.get("prijsMin"),
    prijsMax: formData.get("prijsMax"),
    stapgrootte: formData.get("stapgrootte"),
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
  if (isUploadedFile(file)) {
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

export async function createMaterialOptionAction(
  materialCategoryId: string,
  _prevState: MaterialOptionFormState,
  formData: FormData
): Promise<MaterialOptionFormState> {
  const user = await requireUser();

  const parsed = parseMaterialOptionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const category = await prisma.materialCategory.findFirst({
    where: { id: materialCategoryId, product: { userId: user.id } },
    select: { productId: true },
  });
  if (!category) {
    return { error: "Categorie niet gevonden" };
  }

  const fotoResult = await resolveFoto(user.id, formData, null);
  if (fotoResult.error) {
    return { error: fotoResult.error };
  }

  const count = await prisma.materialOption.count({ where: { materialCategoryId } });

  await prisma.materialOption.create({
    data: { ...parsed.data, foto: fotoResult.foto, materialCategoryId, order: count },
  });

  revalidatePath(`/dashboard/producten/${category.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function updateMaterialOptionAction(
  materialOptionId: string,
  _prevState: MaterialOptionFormState,
  formData: FormData
): Promise<MaterialOptionFormState> {
  const user = await requireUser();

  const parsed = parseMaterialOptionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const option = await prisma.materialOption.findFirst({
    where: { id: materialOptionId, materialCategory: { product: { userId: user.id } } },
    select: { foto: true, materialCategory: { select: { productId: true } } },
  });
  if (!option) {
    return { error: "Materiaal niet gevonden" };
  }

  const fotoResult = await resolveFoto(user.id, formData, option.foto);
  if (fotoResult.error) {
    return { error: fotoResult.error };
  }

  await prisma.materialOption.update({
    where: { id: materialOptionId },
    data: { ...parsed.data, foto: fotoResult.foto },
  });

  revalidatePath(`/dashboard/producten/${option.materialCategory.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function deleteMaterialOptionAction(formData: FormData) {
  const user = await requireUser();
  const materialOptionId = formData.get("materialOptionId");
  if (typeof materialOptionId !== "string") return;

  const option = await prisma.materialOption.findFirst({
    where: { id: materialOptionId, materialCategory: { product: { userId: user.id } } },
    select: { foto: true, materialCategory: { select: { productId: true } } },
  });
  if (!option) return;

  await prisma.materialOption.delete({ where: { id: materialOptionId } });
  if (option.foto) await deleteFoto(option.foto);

  revalidatePath(`/dashboard/producten/${option.materialCategory.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}

export async function toggleMaterialOptionActiveAction(formData: FormData) {
  const user = await requireUser();
  const materialOptionId = formData.get("materialOptionId");
  const actief = formData.get("actief") === "true";
  if (typeof materialOptionId !== "string") return;

  const option = await prisma.materialOption.findFirst({
    where: { id: materialOptionId, materialCategory: { product: { userId: user.id } } },
    select: { materialCategory: { select: { productId: true } } },
  });
  if (!option) return;

  await prisma.materialOption.update({
    where: { id: materialOptionId },
    data: { actief: !actief },
  });

  revalidatePath(`/dashboard/producten/${option.materialCategory.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}
