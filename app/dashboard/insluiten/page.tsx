import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { getEmbedCode } from "@/app/lib/url";
import { effectiveTier, isProTier } from "@/app/lib/subscription";
import { Card, CardContent } from "@/app/components/ui/card";
import { ProFeatureLock } from "@/app/components/dashboard/pro-feature-lock";
import { EmbedTutorialTabs } from "./embed-tutorial-tabs";

export const metadata: Metadata = { title: "Rekentool insluiten" };

export default async function InsluitenPage() {
  const { company } = await requireActiveCompany();
  const magEmbedden = isProTier(effectiveTier(company));
  const embedCode = magEmbedden ? await getEmbedCode(company.slug, company.naam) : "";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Rekentool insluiten</h1>
        <p className="mt-1 text-muted-foreground">
          Stap-voor-stap uitleg om de rekentool als iframe op je eigen website te plaatsen,
          per platform.
        </p>
      </div>

      {magEmbedden ? (
        <Card>
          <CardContent>
            <EmbedTutorialTabs embedCode={embedCode} />
          </CardContent>
        </Card>
      ) : (
        <ProFeatureLock
          title="Alleen bij Pro"
          description="Sluit je rekentool rechtstreeks in op je eigen website via een iframe. Upgrade naar Pro om de insluitcode en deze handleiding te ontgrendelen."
        />
      )}
    </div>
  );
}
