import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { WachtwoordVergetenForm } from "./wachtwoord-vergeten-form";

export const metadata: Metadata = {
  title: "Wachtwoord vergeten",
  alternates: { canonical: "/wachtwoord-vergeten" },
};

export default function WachtwoordVergetenPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1" className="text-xl">
          Wachtwoord vergeten?
        </CardTitle>
        <CardDescription>
          Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WachtwoordVergetenForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
