import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getToolCostSettings, requireActiveCompany, requireUser } from "@/app/lib/dal";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { RekentoolEditor } from "@/app/dashboard/tools/[toolId]/editor/rekentool-editor";
import { laadEditorProps } from "@/app/dashboard/tools/[toolId]/editor/laad-editor";
import { TarievenProvider } from "@/app/dashboard/tools/[toolId]/tarieven-context";
import { PaneelAccountMaken } from "./paneel-account-maken";

export const metadata: Metadata = { title: "Je rekentool", robots: { index: false, follow: false } };

function dagenTot(datum: Date | null): number {
  return datum ? Math.max(1, Math.ceil((datum.getTime() - Date.now()) / 86_400_000)) : 7;
}

// Dezelfde editor als in het dashboard, voor iemand zonder account. Alleen de
// randen verschillen (zie `gast` in RekentoolEditor).
export default async function GastEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ paneel?: string; logo?: string; bestaat?: string; fout?: string }>;
}) {
  const sp = await searchParams;
  // Zonder sessie (bijv. verlopen of andere browser): terug naar het begin.
  const {
    data: { user: authUser },
  } = await (await createClient()).auth.getUser();
  if (!authUser) redirect("/probeer");
  const user = await requireUser();
  if (!user.isGast) redirect("/dashboard");

  const { company } = await requireActiveCompany();
  const tool = await prisma.tool.findFirst({ where: { companyId: company.id, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!tool) redirect("/probeer");

  const [props, costSettings] = await Promise.all([laadEditorProps(tool.id, sp.paneel, true), getToolCostSettings(tool.id, company)]);
  const dagenOver = dagenTot(company.gastVerlooptOp);

  return (
    <TarievenProvider toolId={tool.id} costSettings={costSettings}>
      <RekentoolEditor
        {...props}
        startPaneel={sp.bestaat || sp.fout ? "account" : props.startPaneel}
        gast={{
          verlooptOpTekst: `Je voorbeeld blijft ${dagenOver} ${dagenOver === 1 ? "dag" : "dagen"} bewaard.`,
          logoMislukt: sp.logo === "mislukt",
          accountPaneel: <PaneelAccountMaken googleBestaat={sp.bestaat === "google"} googleFout={sp.fout === "google"} />,
        }}
      />
    </TarievenProvider>
  );
}
