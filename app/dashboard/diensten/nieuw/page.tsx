import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { createServiceAction } from "@/app/lib/actions/services";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Nieuwe dienst" };

export default async function NieuweDienstPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe dienst</h1>
        <p className="mt-1 text-muted-foreground">
          Voeg een dienst toe aan je aanbod.
        </p>
      </div>
      <ServiceForm action={createServiceAction} categories={categories} />
    </div>
  );
}
