import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Logo } from "@/app/components/ui/logo";
import { CompanyForm } from "@/app/dashboard/bedrijven/nieuw/company-form";

export const metadata: Metadata = { title: "Welkom bij Kostenplan" };

export default async function OnboardingBedrijfPage() {
  const user = await requireUser();

  // Iemand die hier terugkomt (bijv. via de browser-terugknop) nadat er al
  // een bedrijf is, hoort meteen door te gaan naar het dashboard in plaats
  // van nog een keer een bedrijf te kunnen aanmaken.
  const heeftAlBedrijf = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (heeftAlBedrijf) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Logo />
        Kostenplan
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-xl">
            Welkom!
          </CardTitle>
          <CardDescription>Nog één stap: maak je eerste bedrijf aan om te starten.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">Ingelogd als</p>
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          </div>
          <CompanyForm cancelHref={null} />
        </CardContent>
      </Card>
    </div>
  );
}
