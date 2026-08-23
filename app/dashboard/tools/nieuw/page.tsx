import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates";
import { MODULAIRE_CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates-modulair";
import { onderdeelTemplateById } from "@/app/lib/calculator-engine/templates-onderdeel";
import { StartpuntKiezer } from "./startpunt-kiezer";

export const metadata: Metadata = { title: "Nieuwe rekentool" };

export default async function NieuweToolPage() {
  await requireActiveCompany();

  const vlakkeTemplates = CALCULATOR_TEMPLATES.map(({ id, naam, categorie, beschrijving, watHetBerekent, resterendWerk, icoon }) => ({
    id,
    soort: "vlak" as const,
    naam,
    categorie,
    beschrijving,
    watHetBerekent,
    resterendWerk,
    icoon,
  }));

  const modulaireTemplates = MODULAIRE_CALCULATOR_TEMPLATES.map((t) => ({
    id: t.id,
    soort: "modulair" as const,
    naam: t.naam,
    categorie: t.categorie,
    beschrijving: t.beschrijving,
    watHetBerekent: t.watHetBerekent,
    resterendWerk: t.resterendWerk,
    icoon: t.icoon,
    onderdelenAantal: t.onderdeelTemplateIds.length,
    onderdeelNamen: t.onderdeelTemplateIds.map((id) => onderdeelTemplateById(id)?.naam).filter((n): n is string => n != null),
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe rekentool</h1>
        <p className="mt-1 text-muted-foreground">
          Kies een startpunt dat lijkt op wat je nodig hebt, of begin helemaal leeg. Je kunt daarna alles aanpassen.
        </p>
      </div>
      <StartpuntKiezer templates={[...modulaireTemplates, ...vlakkeTemplates]} />
    </div>
  );
}
