import type { Metadata } from "next";
import { requireActiveCompany } from "@/app/lib/dal";
import { CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates";
import { MODULAIRE_CALCULATOR_TEMPLATES } from "@/app/lib/calculator-engine/templates-modulair";
import { onderdeelTemplateById } from "@/app/lib/calculator-engine/templates-onderdeel";
import { Breadcrumbs } from "@/app/components/dashboard/breadcrumbs";
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
    <div className="mx-auto flex w-[calc(100%-64px)] max-w-[1500px] flex-col gap-6">
      <Breadcrumbs items={[{ label: "Rekentools", href: "/dashboard/tools" }, { label: "Nieuwe rekentool" }]} />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nieuwe rekentool</h1>
        <p className="mt-1 text-muted-foreground">
          Kies een startpunt dat past bij jouw bedrijf. Je kunt een sjabloon volledig aanpassen of helemaal vanaf 0 beginnen.
        </p>
      </div>
      <StartpuntKiezer templates={[...modulaireTemplates, ...vlakkeTemplates]} />
    </div>
  );
}
