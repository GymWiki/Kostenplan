import type { Metadata } from "next";
import { Eye } from "lucide-react";
import { requireActiveTool } from "@/app/lib/dal";
import { ToolCalculatorPreview } from "@/app/components/dashboard/tool-calculator-preview";

export const metadata: Metadata = { title: "Calculator-voorbeeld" };

export default async function ToolCalculatorPreviewPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4 shrink-0" />
        Dit is een voorbeeld van hoe &ldquo;{tool.naam}&rdquo; eruitziet voor je klant.
      </div>
      <ToolCalculatorPreview company={company} tool={tool} />
    </div>
  );
}
