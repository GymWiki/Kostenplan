import type { Metadata } from "next";
import { requireActiveTool, canCreateTool } from "@/app/lib/dal";
import { effectiveTier } from "@/app/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { ToolSettingsForm } from "./tool-settings-form";
import { DangerZone } from "./danger-zone";

export const metadata: Metadata = { title: "Instellingen" };

export default async function ToolInstellingenPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);
  const magNieuweTool = await canCreateTool(company.id, effectiveTier(company));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Instellingen</h1>
        <p className="mt-1 text-muted-foreground">Naam, icoon en beheeracties voor deze rekentool.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Algemeen</CardTitle>
          <CardDescription>De publieke link zelf verandert hier niet mee.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToolSettingsForm toolId={toolId} tool={tool} />
        </CardContent>
      </Card>

      <DangerZone toolId={toolId} toolNaam={tool.naam} magNieuweTool={magNieuweTool} />
    </div>
  );
}
