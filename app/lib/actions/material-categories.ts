"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { materialCategorySchema } from "@/app/lib/validation";

export type MaterialCategoryFormState = { error?: string } | null;

export async function createMaterialCategoryAction(
  productId: string,
  _prevState: MaterialCategoryFormState,
  formData: FormData
): Promise<MaterialCategoryFormState> {
  const user = await requireUser();

  const parsed = materialCategorySchema.safeParse({
    naam: formData.get("naam"),
    verplicht: formData.get("verplicht"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true },
  });
  if (!product) {
    return { error: "Product niet gevonden" };
  }

  const count = await prisma.materialCategory.count({ where: { productId } });

  await prisma.materialCategory.create({
    data: { productId, naam: parsed.data.naam, verplicht: parsed.data.verplicht, order: count },
  });

  revalidatePath(`/dashboard/producten/${productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function updateMaterialCategoryAction(
  materialCategoryId: string,
  _prevState: MaterialCategoryFormState,
  formData: FormData
): Promise<MaterialCategoryFormState> {
  const user = await requireUser();

  const parsed = materialCategorySchema.safeParse({
    naam: formData.get("naam"),
    verplicht: formData.get("verplicht"),
  });
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

  await prisma.materialCategory.update({
    where: { id: materialCategoryId },
    data: { naam: parsed.data.naam, verplicht: parsed.data.verplicht },
  });

  revalidatePath(`/dashboard/producten/${category.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
  return null;
}

export async function deleteMaterialCategoryAction(formData: FormData) {
  const user = await requireUser();
  const materialCategoryId = formData.get("materialCategoryId");
  if (typeof materialCategoryId !== "string") return;

  const category = await prisma.materialCategory.findFirst({
    where: { id: materialCategoryId, product: { userId: user.id } },
    select: { productId: true },
  });
  if (!category) return;

  await prisma.materialCategory.delete({ where: { id: materialCategoryId } });

  revalidatePath(`/dashboard/producten/${category.productId}/bewerken`);
  revalidatePath(`/portaal/${user.slug}`);
}
