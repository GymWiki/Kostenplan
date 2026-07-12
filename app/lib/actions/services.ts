"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { serviceSchema } from "@/app/lib/validation";

export type ServiceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    eenheid: formData.get("eenheid"),
    arbeidstijd: formData.get("arbeidstijd"),
    materiaalkosten: formData.get("materiaalkosten"),
    actief: formData.get("actief") === "on",
  });
}

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();
  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const count = await prisma.service.count({ where: { userId: user.id } });

  await prisma.service.create({
    data: {
      ...parsed.data,
      userId: user.id,
      order: count,
    },
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${user.slug}`);
  redirect("/dashboard/diensten");
}

export async function updateServiceAction(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await requireUser();
  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.service.updateMany({
    where: { id: serviceId, userId: user.id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${user.slug}`);
  redirect("/dashboard/diensten");
}

export async function deleteServiceAction(formData: FormData) {
  const user = await requireUser();
  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string") return;

  await prisma.service.deleteMany({ where: { id: serviceId, userId: user.id } });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${user.slug}`);
}

export async function toggleServiceActiveAction(formData: FormData) {
  const user = await requireUser();
  const serviceId = formData.get("serviceId");
  const actief = formData.get("actief") === "true";
  if (typeof serviceId !== "string") return;

  await prisma.service.updateMany({
    where: { id: serviceId, userId: user.id },
    data: { actief: !actief },
  });

  revalidatePath("/dashboard/diensten");
  revalidatePath(`/portaal/${user.slug}`);
}
