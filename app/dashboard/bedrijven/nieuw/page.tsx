import type { Metadata } from "next";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = { title: "Nieuw bedrijf" };

export default function NieuwBedrijfPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuw bedrijf toevoegen</h1>
        <p className="mt-1 text-muted-foreground">
          Een nieuw bedrijf start met een lege catalogus en het Gratis-pakket. Je kunt daarna
          producten, diensten en instellingen opbouwen zoals bij een nieuw account.
        </p>
      </div>
      <CompanyForm />
    </div>
  );
}
