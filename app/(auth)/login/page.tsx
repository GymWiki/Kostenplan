import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welkom terug</CardTitle>
        <CardDescription>
          Log in om je kostencalculator te beheren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error === "confirmatie-mislukt" && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            De bevestigingslink is ongeldig of verlopen. Probeer opnieuw te registreren of vraag
            een nieuwe link aan.
          </p>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nog geen account?{" "}
          <Link href="/registreren" className="font-medium text-primary hover:underline">
            Registreer je bedrijf
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
