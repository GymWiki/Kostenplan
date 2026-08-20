import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates";
import { StartpuntKiezer } from "./startpunt-kiezer";

export const metadata: Metadata = { title: "Nieuwe rekentool" };

export default async function NieuweToolPage() {
  await requireActiveCompany();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe rekentool</h1>
        <p className="mt-1 text-muted-foreground">
          Kies een startpunt dat lijkt op wat je nodig hebt, of begin helemaal leeg. Je kunt daarna alles aanpassen.
        </p>
      </div>
      <StartpuntKiezer
        templates={CALCULATOR_TEMPLATES.map(({ id, naam, categorie, beschrijving, watHetBerekent, resterendWerk, icoon }) => ({
          id,
          naam,
          categorie,
          beschrijving,
          watHetBerekent,
          resterendWerk,
          icoon,
        }))}
      />
    </div>
  );
}
