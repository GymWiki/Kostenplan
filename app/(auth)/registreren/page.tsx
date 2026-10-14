import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { veiligVolgende } from "@/app/lib/volgende";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Registreren",
  description:
    "Maak gratis je eigen offertecalculator op Kostenplan en ontvang binnen 1 minuut je eerste klantenportaal.",
  alternates: { canonical: "/registreren" },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const volgende = veiligVolgende((await searchParams).next, "") || undefined;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Start met Kostenplan</CardTitle>
        <CardDescription>
          Maak in 1 minuut je eigen rekentool voor klanten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm volgende={volgende} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Heb je al een account?{" "}
          <Link href={volgende ? `/login?next=${encodeURIComponent(volgende)}` : "/login"} className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
