import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { MarketingPricingTable } from "@/app/components/pricing/marketing-pricing-table";

export const metadata: Metadata = { title: "Prijzen" };

export default function PrijzenPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-20 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simpele, eerlijke prijzen
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Begin gratis en groei mee. Betaal maandelijks of kies jaarlijks voor de beste prijs —
            altijd maandelijks op te zeggen.
          </p>
        </div>
        <div className="mt-14">
          <MarketingPricingTable />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
