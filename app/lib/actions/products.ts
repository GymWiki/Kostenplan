"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { productSchema } from "@/app/lib/validation";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    eenheid: formData.get("eenheid"),
    actief: formData.get("actief") === "on",
  });
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const user = await requireUser();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const count = await prisma.product.count({ where: { userId: user.id } });

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      userId: user.id,
      order: count,
    },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${user.slug}`);
  redirect(`/dashboard/producten/${product.id}/bewerken`);
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const user = await requireUser();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.product.updateMany({
    where: { id: productId, userId: user.id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${user.slug}`);
  redirect("/dashboard/producten");
}

export async function deleteProductAction(formData: FormData) {
  const user = await requireUser();
  const productId = formData.get("productId");
  if (typeof productId !== "string") return;

  await prisma.product.deleteMany({ where: { id: productId, userId: user.id } });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${user.slug}`);
}

export async function toggleProductActiveAction(formData: FormData) {
  const user = await requireUser();
  const productId = formData.get("productId");
  const actief = formData.get("actief") === "true";
  if (typeof productId !== "string") return;

  await prisma.product.updateMany({
    where: { id: productId, userId: user.id },
    data: { actief: !actief },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${user.slug}`);
}
