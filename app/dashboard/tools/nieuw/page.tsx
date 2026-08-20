import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { NieuweToolForm } from "./nieuwe-tool-form";

export const metadata: Metadata = { title: "Nieuwe rekentool" };

export default async function NieuweToolPage() {
  await requireActiveCompany();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe rekentool</h1>
        <p className="mt-1 text-muted-foreground">
          Begin leeg — je stelt de producten, prijzen en huisstijl hierna zelf in.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-base">
            Rekentool-gegevens
          </CardTitle>
          <CardDescription>Je kunt de naam en het icoon later altijd nog wijzigen.</CardDescription>
        </CardHeader>
        <CardContent>
          <NieuweToolForm />
        </CardContent>
      </Card>
    </div>
  );
}
