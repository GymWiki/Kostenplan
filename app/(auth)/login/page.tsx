import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welkom terug</CardTitle>
        <CardDescription>
          Log in om je kostencalculator te beheren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nog geen account?{" "}
          <Link href="/registreren" className="font-medium text-primary hover:underline">
            Registreer je hoveniersbedrijf
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
