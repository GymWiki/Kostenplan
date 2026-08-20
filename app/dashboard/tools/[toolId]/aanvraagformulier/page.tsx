import type { Metadata } from "next";
import { requireActiveTool } from "@/app/lib/dal";
import { parseLeadFormConfig } from "@/app/lib/tools";
import { LeadFormConfigForm } from "./lead-form-config-form";

export const metadata: Metadata = { title: "Aanvraagformulier" };

export default async function AanvraagformulierPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { tool } = await requireActiveTool(toolId);
  const config = parseLeadFormConfig(tool.leadFormConfig);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Aanvraagformulier</h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal welke gegevens je klant invult om een aanvraag te versturen.
        </p>
      </div>
      <LeadFormConfigForm toolId={toolId} config={config} />
    </div>
  );
}
