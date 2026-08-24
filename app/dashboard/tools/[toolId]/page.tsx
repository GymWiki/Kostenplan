import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Package, Euro, Palette, Target, ClipboardList, Rocket, Code2 } from "lucide-react";
import { requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolUrl } from "@/app/lib/url";
import { getToolAnalyticsSummary } from "@/app/lib/analytics";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { CopyButton } from "@/app/components/dashboard/copy-link";

export const metadata: Metadata = { title: "Overzicht" };

const KWARTIER_LINKS = [
  { segment: "producten", label: "Producten", icon: Package, beschrijving: "Wat je klant kan kiezen" },
  { segment: "prijzen", label: "Prijzen", icon: Euro, beschrijving: "Arbeid, transport, voorrijkosten, btw" },
  { segment: "uiterlijk", label: "Uiterlijk", icon: Palette, beschrijving: "Logo, kleuren en teksten" },
  { segment: "resultaat", label: "Resultaat", icon: Target, beschrijving: "Prijsweergave en call-to-action" },
  { segment: "aanvraagformulier", label: "Aanvraagformulier", icon: ClipboardList, beschrijving: "Welke gegevens je vraagt" },
  { segment: "embed", label: "Embed", icon: Code2, beschrijving: "Insluiten op je eigen website" },
] as const;

export default async function ToolOverzichtPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);

  const [productenCount, leadsCount, analytics] = await Promise.all([
    prisma.product.count({ where: { toolId } }),
    prisma.lead.count({ where: { toolId } }),
    getToolAnalyticsSummary(toolId),
  ]);
  const toolUrl = await getToolUrl(company.slug, tool.slug);

  return (
    <div className="flex flex-col gap-6">
      {tool.status === "GEPUBLICEERD" ? (
        <Card>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Publieke link</p>
              <p className="truncate text-sm text-muted-foreground">{toolUrl}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <CopyButton text={toolUrl} />
              <LinkButton href={toolUrl} target="_blank" variant="secondary">
                <Eye className="h-4 w-4" />
                Bekijken
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {tool.status === "CONCEPT" ? "Deze rekentool is nog niet gepubliceerd" : "Deze rekentool is gepauzeerd"}
              </p>
              <p className="text-sm text-muted-foreground">
                Klanten kunnen &lsquo;m nog niet zien. Publiceer om de link en embed te activeren.
              </p>
            </div>
            <LinkButton href={`/dashboard/tools/${toolId}/publiceren`} className="shrink-0">
              <Rocket className="h-4 w-4" />
              Publiceren
            </LinkButton>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <StatCard label="Producten" value={productenCount} />
        <StatCard label="Aanvragen" value={leadsCount} />
        <StatCard label="Bezoeken" value={analytics.bezoeken} />
        <StatCard
          label="Conversie"
          value={analytics.conversieRatio === null ? "—" : `${analytics.conversieRatio}%`}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Snel naar</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {KWARTIER_LINKS.map((item) => (
            <Link key={item.segment} href={`/dashboard/tools/${toolId}/${item.segment}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.beschrijving}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
