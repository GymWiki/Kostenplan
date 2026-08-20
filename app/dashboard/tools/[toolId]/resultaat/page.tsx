import type { Metadata } from "next";
import { requireActiveTool } from "@/app/lib/dal";
import { parseResultaatConfig } from "@/app/lib/tools";
import { ResultaatForm } from "./resultaat-form";

export const metadata: Metadata = { title: "Resultaat" };

export default async function ResultaatPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { tool } = await requireActiveTool(toolId);
  const config = parseResultaatConfig(tool.resultaatConfig);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Resultaat</h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal hoe de berekende prijs en de call-to-action aan je klant worden getoond.
        </p>
      </div>
      <ResultaatForm toolId={toolId} config={config} />
    </div>
  );
}
