import { getToolCostSettings, requireActiveTool } from "@/app/lib/dal";
import { ToolChrome } from "./tool-chrome";
import { TarievenProvider } from "./tarieven-context";

// Verifieert vooraf, één keer voor alle geneste tool-pagina's, dat de tool
// echt bij het actieve bedrijf hoort — zie requireActiveTool in app/lib/dal.ts.
// De tarieven worden gedeeld met de editor via TarievenProvider.
export default async function ToolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company } = await requireActiveTool(toolId);
  const costSettings = await getToolCostSettings(toolId, company);

  return (
    <TarievenProvider toolId={toolId} costSettings={costSettings}>
      <ToolChrome>{children}</ToolChrome>
    </TarievenProvider>
  );
}
