"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { categorySchema } from "@/app/lib/validation";

export type CategoryFormState = { error?: string } | null;

export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const user = await requireUser();

  const parsed = categorySchema.safeParse({ naam: formData.get("naam") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const count = await prisma.category.count({ where: { userId: user.id } });

  await prisma.category.create({
    data: { userId: user.id, naam: parsed.data.naam, order: count },
  });

  revalidatePath("/dashboard/categorieen");
  return null;
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const user = await requireUser();

  const parsed = categorySchema.safeParse({ naam: formData.get("naam") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  await prisma.category.updateMany({
    where: { id: categoryId, userId: user.id },
    data: { naam: parsed.data.naam },
  });

  revalidatePath("/dashboard/categorieen");
  return null;
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await requireUser();
  const categoryId = formData.get("categoryId");
  if (typeof categoryId !== "string") return;

  await prisma.category.deleteMany({
    where: { id: categoryId, userId: user.id },
  });

  revalidatePath("/dashboard/categorieen");
  revalidatePath("/dashboard/diensten");
  revalidatePath("/dashboard/producten");
}
