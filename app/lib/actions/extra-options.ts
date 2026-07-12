"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { extraOptionSchema } from "@/app/lib/validation";

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

  const count = await prisma.extraOption.count({ where: { productId } });

  await prisma.extraOption.create({
    data: { ...parsed.data, productId, order: count },
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

  await prisma.extraOption.update({
    where: { id: extraOptionId },
    data: parsed.data,
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
