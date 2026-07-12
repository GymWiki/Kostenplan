"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { materialOptionSchema } from "@/app/lib/validation";

export type MaterialOptionFormState = { error?: string } | null;

function parseMaterialOptionForm(formData: FormData) {
  return materialOptionSchema.safeParse({
    naam: formData.get("naam"),
    prijs: formData.get("prijs"),
    actief: formData.get("actief") === "on" || formData.get("actief") === "true",
  });
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
  });
  if (!category) {
    return { error: "Categorie niet gevonden" };
  }

  const count = await prisma.materialOption.count({ where: { materialCategoryId } });

  await prisma.materialOption.create({
    data: { ...parsed.data, materialCategoryId, order: count },
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
    include: { materialCategory: true },
  });
  if (!option) {
    return { error: "Materiaal niet gevonden" };
  }

  await prisma.materialOption.update({
    where: { id: materialOptionId },
    data: parsed.data,
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
    include: { materialCategory: true },
  });
  if (!option) return;

  await prisma.materialOption.delete({ where: { id: materialOptionId } });

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
    include: { materialCategory: true },
  });
  if (!option) return;

  await prisma.materialOption.update({
    where: { id: materialOptionId },
    data: { actief: !actief },
  });

  revalidatePath(`/dashboard/producten/${option.materialCategory.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}
