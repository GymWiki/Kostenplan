import type { Metadata } from "next";
import { requireActiveTool, canPublishTool } from "@/app/lib/dal";
import { getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { Card, CardContent } from "@/app/components/ui/card";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { LinkButton } from "@/app/components/ui/button";
import { PublicerenActions } from "./publiceren-actions";

export const metadata: Metadata = { title: "Publiceren" };

export default async function PublicerenPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);
  const tier = effectiveTier(company);

  const [magPubliceren, toolUrl] = await Promise.all([
    canPublishTool(company.id, tier),
    getToolUrl(company.slug, tool.slug),
  ]);

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Publiceren</h1>
        <p className="mt-1 text-muted-foreground">
          Bepaal of &ldquo;{tool.naam}&rdquo; zichtbaar is voor klanten.
        </p>
      </div>

      <PublicerenActions
        toolId={toolId}
        huidigeStatus={tool.status}
        magPubliceren={magPubliceren}
        limiet={PLAN_LIMITS[tier].maxActiveTools}
      />

      {tool.status === "GEPUBLICEERD" && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Publieke link</p>
              <p className="break-all text-sm text-muted-foreground">{toolUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={toolUrl} />
              <LinkButton href={toolUrl} target="_blank" variant="secondary">
                Bekijken
              </LinkButton>
              <LinkButton href={`/dashboard/tools/${toolId}/embed`} variant="ghost">
                Insluitcode ophalen
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
