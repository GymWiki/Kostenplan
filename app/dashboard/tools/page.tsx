import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Package, Users, Pencil, ExternalLink, Copy } from "lucide-react";
import { requireActiveCompany, canCreateTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolUrl } from "@/app/lib/url";
import { TOOL_STATUS_LABELS } from "@/app/lib/tools";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { getProductIcon } from "@/app/lib/icons";
import { Badge } from "@/app/components/ui/badge";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { duplicateToolAction, softDeleteToolAction } from "@/app/lib/actions/tools";
import { NieuweRekentoolKnop } from "./nieuwe-rekentool-knop";

export const metadata: Metadata = { title: "Rekentools" };

const STATUS_BADGE_VARIANT = {
  CONCEPT: "muted",
  GEPUBLICEERD: "success",
  GEPAUZEERD: "warning",
} as const;

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export default async function ToolsOverzichtPage() {
  const { company } = await requireActiveCompany();
  const tier = effectiveTier(company);

  const tools = await prisma.tool.findMany({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true, leads: true } } },
  });

  const [magNieuweTool, toolUrls] = await Promise.all([
    canCreateTool(company.id, tier),
    Promise.all(tools.map((tool) => getToolUrl(company.slug, tool.slug))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mijn rekentools</h1>
          <p className="mt-1 text-muted-foreground">
            Elke rekentool heeft zijn eigen producten, prijzen, huisstijl en publieke link.
          </p>
        </div>
        <NieuweRekentoolKnop
          atLimit={!magNieuweTool}
          limiet={PLAN_LIMITS[tier].maxActiveTools}
        />
      </div>

      {tools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wrench className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nog geen rekentools</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Maak je eerste rekentool om klanten direct een prijsindicatie te kunnen geven.
              </p>
            </div>
            <NieuweRekentoolKnop atLimit={!magNieuweTool} limiet={PLAN_LIMITS[tier].maxActiveTools} variant="secondary" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
            const ToolIcon = getProductIcon(tool.icoon);
            const toolUrl = toolUrls[i];
            return (
              <Card key={tool.id} className="flex flex-col overflow-hidden">
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {ToolIcon && (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ToolIcon className="h-4.5 w-4.5" />
                        </span>
                      )}
                      <Link href={`/dashboard/tools/${tool.id}`} className="font-medium text-foreground hover:underline">
                        {tool.naam}
                      </Link>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[tool.status]}>{TOOL_STATUS_LABELS[tool.status]}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      {tool._count.products} product{tool._count.products === 1 ? "" : "en"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {tool._count.leads} aanvra{tool._count.leads === 1 ? "ag" : "gen"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Laatst bijgewerkt op {dateFormatter.format(tool.updatedAt)}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                    <LinkButton href={`/dashboard/tools/${tool.id}`} variant="secondary" size="sm">
                      <Pencil className="h-3.5 w-3.5" />
                      Bewerken
                    </LinkButton>
                    {tool.status === "GEPUBLICEERD" ? (
                      <LinkButton href={toolUrl} target="_blank" variant="ghost" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Bekijken
                      </LinkButton>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" disabled>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Bekijken
                      </Button>
                    )}
                    {tool.status === "GEPUBLICEERD" && (
                      <CopyButton text={toolUrl} label="Delen" className="h-8 px-3 text-sm" />
                    )}
                    <form action={duplicateToolAction}>
                      <input type="hidden" name="toolId" value={tool.id} />
                      <Button type="submit" variant="ghost" size="sm" disabled={!magNieuweTool}>
                        <Copy className="h-3.5 w-3.5" />
                        Dupliceren
                      </Button>
                    </form>
                    <LinkButton href={`/dashboard/tools/${tool.id}/instellingen`} variant="ghost" size="sm">
                      Instellingen
                    </LinkButton>
                    <div className="ml-auto">
                      <DeleteButton
                        action={softDeleteToolAction}
                        id={tool.id}
                        idField="toolId"
                        confirmTitle={`"${tool.naam}" verwijderen?`}
                        confirmMessage="De openbare link en embed werken hierna niet meer. Leads en offertes van deze tool blijven bewaard."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
