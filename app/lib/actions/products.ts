"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { productSchema } from "@/app/lib/validation";
import { effectiveTier, GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    eenheid: formData.get("eenheid"),
    arbeidsCapaciteit: formData.get("arbeidsCapaciteit"),
    arbeidTariefOverride: formData.get("arbeidTariefOverride"),
    materiaalMargeOverride: formData.get("materiaalMargeOverride"),
    transportkosten: formData.get("transportkosten") ?? 0,
    icoon: formData.get("icoon") ?? "",
    actief: formData.get("actief") === "on",
  });
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  // Alvast opgehaald voor de Gratis-limietcheck hieronder — meteen ook
  // hergebruikt voor "order" verderop, zodat dezelfde telling niet twee keer
  // wordt uitgevoerd.
  let productCount: number | undefined;
  if (effectiveTier(company) === "GRATIS") {
    const [count, serviceCount] = await Promise.all([
      prisma.product.count({ where: { companyId: company.id } }),
      prisma.service.count({ where: { companyId: company.id } }),
    ]);
    productCount = count;
    if (count + serviceCount >= GRATIS_CATALOGUS_LIMIET) {
      return {
        error: `Je hebt de limiet van ${GRATIS_CATALOGUS_LIMIET} diensten en producten voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor onbeperkt diensten en producten.`,
      };
    }
  }

  const count = productCount ?? (await prisma.product.count({ where: { companyId: company.id } }));

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      companyId: company.id,
      order: count,
    },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
  redirect(`/dashboard/producten/${product.id}/bewerken`);
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.product.updateMany({
    where: { id: productId, companyId: company.id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
  redirect("/dashboard/producten");
}

export async function deleteProductAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const productId = formData.get("productId");
  if (typeof productId !== "string") return;

  await prisma.product.deleteMany({ where: { id: productId, companyId: company.id } });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
}

export async function toggleProductActiveAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const productId = formData.get("productId");
  const actief = formData.get("actief") === "true";
  if (typeof productId !== "string") return;

  await prisma.product.updateMany({
    where: { id: productId, companyId: company.id },
    data: { actief: !actief },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
}
