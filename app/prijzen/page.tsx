import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Prijzen" };

export default function PrijzenPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-20 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Prijzen
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Kostenplan is op dit moment helemaal gratis te gebruiken. Maak je rekentool aan,
            richt hem in met je eigen diensten en producten, en deel de link met je klanten —
            zonder kosten.
          </p>
        </div>
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="font-semibold text-foreground">Benieuwd wat Kostenplan voor je doet?</p>
            <p className="text-sm text-muted-foreground">
              Maak binnen 5 minuten je eerste kostencalculator aan.
            </p>
            <LinkButton href="/registreren" size="lg">
              Start nu gratis
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
