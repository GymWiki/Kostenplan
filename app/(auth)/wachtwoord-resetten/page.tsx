import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { WachtwoordResettenForm } from "./wachtwoord-resetten-form";

export const metadata: Metadata = { title: "Nieuw wachtwoord instellen" };

// Alleen bereikbaar met een geldige sessie — die ontstaat hier ofwel via de
// reset-link (auth/callback wisselt de code om voor een tijdelijke sessie
// en stuurt hierheen door), ofwel omdat iemand al gewoon ingelogd is. Zonder
// sessie stuurt requireUser() (zie dal.ts) door naar /login.
export default async function WachtwoordResettenPage() {
  await requireUser();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1" className="text-xl">
          Nieuw wachtwoord instellen
        </CardTitle>
        <CardDescription>Kies een nieuw wachtwoord voor je account.</CardDescription>
      </CardHeader>
      <CardContent>
        <WachtwoordResettenForm />
      </CardContent>
    </Card>
  );
}
