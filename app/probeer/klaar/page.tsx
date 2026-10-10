import type { Metadata } from "next";
import { requireActiveCompany, requireVolledigAccount, canPublishTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getToolUrl } from "@/app/lib/url";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { adminFontClasses } from "@/app/lib/admin-fonts";
import { LinkButton } from "@/app/components/ui/button";
import { PaneelWebsite } from "@/app/dashboard/tools/[toolId]/editor/paneel-instellingen";
import { DEFAULT_EMBED_CONFIG } from "@/app/lib/tools";
import { BedrijfsnaamVeld } from "./bedrijfsnaam-veld";

export const metadata: Metadata = { title: "Je account is klaar", robots: { index: false, follow: false } };

// Na het account-maken: dezelfde rekentool, nu in je eigen account. Naam
// controleren en op je website zetten. Op het gratis pakket kan dat met een
// link; de code om hem in je eigen website te plaatsen hoort bij Pro.
export default async function KlaarPage() {
  await requireVolledigAccount();
  const { company } = await requireActiveCompany();
  const tool = await prisma.tool.findFirst({ where: { companyId: company.id, deletedAt: null }, orderBy: { createdAt: "desc" } });
  const tier = effectiveTier(company);
  const [toolUrl, magPubliceren] = await Promise.all([tool ? getToolUrl(company.slug, tool.slug) : Promise.resolve(""), canPublishTool(company.id, tier)]);

  return (
    <div data-admin-theme className={`min-h-dvh bg-background text-foreground ${adminFontClasses}`}>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Je account is klaar</h1>
          <p className="mt-1 text-muted-foreground">Je rekentool staat erin, precies zoals je hem had gemaakt.</p>
        </div>
        <BedrijfsnaamVeld start={company.naam} />
        {tool && (
          <PaneelWebsite
            toolId={tool.id}
            toolNaam={tool.naam}
            status={tool.status}
            toolUrl={toolUrl}
            embedCode={null}
            embedConfig={DEFAULT_EMBED_CONFIG}
            magEmbedden={PLAN_LIMITS[tier].embedEnabled}
            magPubliceren={magPubliceren}
            limiet={PLAN_LIMITS[tier].maxActiveTools}
          />
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {tool && (
            <LinkButton href={`/dashboard/tools/${tool.id}`} size="lg" className="w-full sm:flex-1">
              Verder aanpassen
            </LinkButton>
          )}
          <LinkButton href="/dashboard" variant="outline" size="lg" className="w-full sm:flex-1">
            Naar mijn dashboard
          </LinkButton>
        </div>
      </main>
    </div>
  );
}
