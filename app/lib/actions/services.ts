"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { serviceSchema } from "@/app/lib/validation";
import { effectiveTier, GRATIS_CATALOGUS_LIMIET } from "@/app/lib/subscription";

export type ServiceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    prijsType: formData.get("prijsType"),
    uurtarief: formData.get("uurtarief") ?? 0,
    geschatteUren: formData.get("geschatteUren") ?? 0,
    vastePrijs: formData.get("vastePrijs") ?? 0,
    bandbreedteType: formData.get("bandbreedteType") || "VAST",
    geschatteUrenMin: formData.get("geschatteUrenMin"),
    geschatteUrenMax: formData.get("geschatteUrenMax"),
    vastePrijsMin: formData.get("vastePrijsMin"),
    vastePrijsMax: formData.get("vastePrijsMax"),
    icoon: formData.get("icoon") ?? "",
    actief: formData.get("actief") === "on",
  });
}

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const { company } = await requireActiveCompany();
  const parsed = parseServiceForm(formData);
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
  let serviceCount: number | undefined;
  if (effectiveTier(company) === "GRATIS") {
    const [productCount, count] = await Promise.all([
      prisma.product.count({ where: { companyId: company.id } }),
      prisma.service.count({ where: { companyId: company.id } }),
    ]);
    serviceCount = count;
    if (productCount + count >= GRATIS_CATALOGUS_LIMIET) {
      return {
        error: `Je hebt de limiet van ${GRATIS_CATALOGUS_LIMIET} diensten en producten voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor onbeperkt diensten en producten.`,
      };
    }
  }

  const count = serviceCount ?? (await prisma.service.count({ where: { companyId: company.id } }));

  await prisma.service.create({
    data: {
      ...parsed.data,
      companyId: company.id,
      order: count,
    },
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${company.slug}`);
  redirect("/dashboard/diensten");
}

export async function updateServiceAction(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const { company } = await requireActiveCompany();
  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.service.updateMany({
    where: { id: serviceId, companyId: company.id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${company.slug}`);
  redirect("/dashboard/diensten");
}

export async function deleteServiceAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string") return;

  await prisma.service.deleteMany({ where: { id: serviceId, companyId: company.id } });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${company.slug}`);
}

export async function toggleServiceActiveAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const serviceId = formData.get("serviceId");
  const actief = formData.get("actief") === "true";
  if (typeof serviceId !== "string") return;

  await prisma.service.updateMany({
    where: { id: serviceId, companyId: company.id },
    data: { actief: !actief },
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${company.slug}`);
}
