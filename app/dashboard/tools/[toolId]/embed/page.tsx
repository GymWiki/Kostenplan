import type { Metadata } from "next";
import { requireActiveTool } from "@/app/lib/dal";
import { getToolEmbedCode, getToolUrl } from "@/app/lib/url";
import { parseEmbedConfig } from "@/app/lib/tools";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { Card, CardContent } from "@/app/components/ui/card";
import { ProFeatureLock } from "@/app/components/dashboard/pro-feature-lock";
import { EmbedTutorialTabs } from "./embed-tutorial-tabs";
import { EmbedSettingsForm } from "./embed-settings-form";

export const metadata: Metadata = { title: "Embed" };

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const { company, tool } = await requireActiveTool(toolId);
  const magEmbedden = PLAN_LIMITS[effectiveTier(company)].embedEnabled;
  const embedConfig = parseEmbedConfig(tool.embedConfig);
  const [embedCode, toolUrl] = magEmbedden
    ? await Promise.all([getToolEmbedCode(toolId, tool.naam, embedConfig), getToolUrl(company.slug, tool.slug)])
    : [null, null];

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Embed</h1>
        <p className="mt-1 text-muted-foreground">
          Sluit <strong>{tool.naam}</strong> rechtstreeks in op je eigen website via een iframe.
        </p>
      </div>

      {magEmbedden && embedCode ? (
        <>
          <EmbedSettingsForm toolId={toolId} embedConfig={embedConfig} />
          <Card>
            <CardContent>
              <EmbedTutorialTabs embedCode={embedCode} />
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            De iframe laadt altijd rechtstreeks {tool.naam} — nooit een andere rekentool van je bedrijf.
            Publieke URL: <span className="font-mono">{toolUrl}</span>
          </p>
        </>
      ) : (
        <ProFeatureLock
          title="Alleen bij Pro"
          description="Sluit je rekentool rechtstreeks in op je eigen website via een iframe. Upgrade naar Pro om de insluitcode en deze handleiding te ontgrendelen."
        />
      )}
    </div>
  );
}
