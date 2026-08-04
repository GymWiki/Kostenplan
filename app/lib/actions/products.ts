"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { productSchema } from "@/app/lib/validation";
import { effectiveTier, GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";
import type { Prisma } from "@/app/generated/prisma/client";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    eenheid: formData.get("eenheid"),
    sjabloon: formData.get("sjabloon") ?? "ENKELE_HOEVEELHEID",
    sjabloonConfig: formData.get("sjabloonConfig") ?? "{}",
    prijsPerEenheid: formData.get("prijsPerEenheid"),
    prijsPerEenheidType: formData.get("prijsPerEenheidType") ?? "VAST",
    prijsPerEenheidMin: formData.get("prijsPerEenheidMin"),
    prijsPerEenheidMax: formData.get("prijsPerEenheidMax"),
    minimumprijs: formData.get("minimumprijs"),
    staffels: formData.get("staffels") ?? "[]",
    arbeidsCapaciteit: formData.get("arbeidsCapaciteit"),
    arbeidTariefOverride: formData.get("arbeidTariefOverride"),
    materiaalMargeOverride: formData.get("materiaalMargeOverride"),
    transportkosten: formData.get("transportkosten") ?? 0,
    icoon: formData.get("icoon") ?? "",
    actief: formData.get("actief") === "on",
  });
}

type ActiveCompany = Awaited<ReturnType<typeof requireActiveCompany>>["company"];

type CreateProductResult =
  | { success: true; productId: string }
  | { success: false; state: ProductFormState };

// Gedeelde kernlogica van "nieuw product aanmaken" — los van of de aanroeper
// daarna doorstuurt (createProductAction, het gewone formulier) of in dezelfde
// pagina blijft om verder te gaan met een volgende wizardstap
// (createProductDraftAction, zie nieuw/product-wizard.tsx).
async function createProduct(company: ActiveCompany, formData: FormData): Promise<CreateProductResult> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { success: false, state: { fieldErrors } };
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
        success: false,
        state: {
          error: `Je hebt de limiet van ${GRATIS_CATALOGUS_LIMIET} diensten en producten voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor onbeperkt diensten en producten.`,
        },
      };
    }
  }

  const count = productCount ?? (await prisma.product.count({ where: { companyId: company.id } }));

  const { staffels, ...productData } = parsed.data;
  const product = await prisma.product.create({
    data: {
      ...productData,
      sjabloonConfig: productData.sjabloonConfig as Prisma.InputJsonValue,
      companyId: company.id,
      order: count,
      staffels: { create: staffels.map((s, order) => ({ ...s, order })) },
    },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
  return { success: true, productId: product.id };
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const result = await createProduct(company, formData);
  if (!result.success) return result.state;
  redirect(`/dashboard/producten/${result.productId}/bewerken`);
}

// Voor de wizard (nieuw/product-wizard.tsx): maakt het product aan zonder
// door te sturen, zodat de wizard op dezelfde pagina met stap 2 verder kan —
// "elke wizardstap slaat direct op als concept" uit de opdracht.
export type CreateProductDraftState = { error?: string; fieldErrors?: Record<string, string>; productId?: string } | null;

export async function createProductDraftAction(
  _prevState: CreateProductDraftState,
  formData: FormData
): Promise<CreateProductDraftState> {
  const { company } = await requireActiveCompany();
  const result = await createProduct(company, formData);
  if (!result.success) return result.state;
  return { productId: result.productId };
}

type SaveProductResult = { success: true } | { success: false; state: ProductFormState };

async function saveProduct(
  productId: string,
  company: ActiveCompany,
  formData: FormData
): Promise<SaveProductResult> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { success: false, state: { fieldErrors } };
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, companyId: company.id },
    select: { id: true },
  });
  if (!existing) return { success: false, state: { error: "Product niet gevonden." } };

  const { staffels, ...productData } = parsed.data;
  // Nested relaties kunnen niet via updateMany (die ondersteunt geen
  // relatie-writes) — vandaar update() op het al geverifieerde id. Staffels
  // volledig vervangen (deleteMany + create) is simpeler en robuuster dan
  // los diffen, en dit is een kleine, zelden gewijzigde lijst.
  await prisma.product.update({
    where: { id: productId },
    data: {
      ...productData,
      sjabloonConfig: productData.sjabloonConfig as Prisma.InputJsonValue,
      staffels: { deleteMany: {}, create: staffels.map((s, order) => ({ ...s, order })) },
    },
  });

  revalidatePath("/dashboard/producten");
  revalidatePath(`/portaal/${company.slug}`);
  return { success: true };
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const result = await saveProduct(productId, company, formData);
  if (!result.success) return result.state;
  redirect("/dashboard/producten");
}

// Voor de wizard: dezelfde opslag als updateProductAction, maar zonder
// doorsturen — de wizard beslist zelf wanneer naar de volgende stap of naar
// het volledige bewerkscherm gegaan wordt.
export async function updateProductDraftAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const result = await saveProduct(productId, company, formData);
  if (!result.success) return result.state;
  return null;
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
