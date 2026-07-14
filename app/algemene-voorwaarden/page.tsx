import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Card, CardContent } from "@/app/components/ui/card";

export const metadata: Metadata = { title: "Algemene Voorwaarden" };

export default function AlgemeneVoorwaardenPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-20 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Algemene Voorwaarden
        </h1>
        <Card className="mt-8">
          <CardContent className="flex flex-col gap-3 py-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              Onze algemene voorwaarden worden op dit moment afgerond en volgen hier binnenkort.
            </p>
            <p>
              Heb je vragen over het gebruik van Kostenplan in de tussentijd? Neem gerust
              contact op via{" "}
              <a
                href="mailto:gymwiki25@gmail.com"
                className="font-medium text-primary hover:underline"
              >
                gymwiki25@gmail.com
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
