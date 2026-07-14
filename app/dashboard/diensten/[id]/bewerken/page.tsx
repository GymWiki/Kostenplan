import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { updateServiceAction } from "@/app/lib/actions/services";
import { ServiceForm } from "../../service-form";

export const metadata: Metadata = { title: "Dienst bewerken" };

export default async function BewerkDienstPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireActiveCompany();

  const service = await prisma.service.findFirst({ where: { id, companyId: company.id } });

  if (!service) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dienst bewerken</h1>
        <p className="mt-1 text-muted-foreground">Werk de gegevens van deze dienst bij.</p>
      </div>
      <ServiceForm action={updateServiceAction.bind(null, service.id)} service={service} />
    </div>
  );
}
