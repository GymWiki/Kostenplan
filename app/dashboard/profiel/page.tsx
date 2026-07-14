import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { ProfielView } from "./profiel-view";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfielPage() {
  const { user, company, alleBedrijven } = await requireActiveCompany();

  return (
    <ProfielView email={user.email} activeCompanyId={company.id} companies={alleBedrijven} />
  );
}
