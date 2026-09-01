import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { Badge } from "@/app/components/ui/badge";
import { Breadcrumbs } from "@/app/components/dashboard/breadcrumbs";
import { getProductIcon } from "@/app/lib/icons";
import { TOOL_STATUS_LABELS } from "@/app/lib/tools";
import { ToolNav } from "./tool-nav";

const STATUS_BADGE_VARIANT = {
  CONCEPT: "muted",
  GEPUBLICEERD: "success",
  GEPAUZEERD: "warning",
} as const;

// Toont de actieve tool prominent in de header (Deel 13/33 van de opdracht:
// "de gebruiker moet altijd weten 'ik pas nu de Tuinaanleg-tool aan'") en
// verifieert vooraf, één keer voor alle geneste tool-pagina's, dat de tool
// echt bij het actieve bedrijf hoort — zie requireActiveTool in
// app/lib/dal.ts. Elke geneste pagina mag daardoor zelf ook nog
// requireActiveTool(toolId) aanroepen (React's cache() dedupet dat binnen
// hetzelfde request) zonder dat de check ooit wordt overgeslagen.
export default async function ToolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { tool } = await requireActiveTool(toolId);
  const ToolIcon = getProductIcon(tool.icoon);

  // UX-audit punt 2: zelfde conditie als in bouwer/page.tsx — een tool met
  // Producten die nog nooit een CalculatorConfig heeft gepubliceerd, toont
  // de Bouwer-tab hier niet (nooit beide systemen tegelijk voor dezelfde tool).
  const productCount = await prisma.product.count({ where: { toolId } });
  const verbergBouwer = productCount > 0 && tool.activeCalculatorConfigId == null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Mijn rekentools", href: "/dashboard/tools" }, { label: tool.naam }]} />
        <div className="flex items-center gap-3">
          {ToolIcon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {/* eslint-disable-next-line react-hooks/static-components -- stable lookup from a module-level icon map, not a new component */}
              <ToolIcon className="h-5 w-5" />
            </span>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{tool.naam}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[tool.status]}>{TOOL_STATUS_LABELS[tool.status]}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="sm:w-52 sm:shrink-0">
          <ToolNav toolId={toolId} verbergBouwer={verbergBouwer} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
