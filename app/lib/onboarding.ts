// Onboarding-checklist op het dashboard-overzicht. Alle drie stappen worden
// live afgeleid van bestaande data (nooit apart opgeslagen) — sinds
// Levering A (multi-tool) is ook "rekentool gepubliceerd" een natuurlijk
// databaseer-spoor (Tool.status), dus is er geen aparte
// "portaal bekeken"-vlag meer nodig zoals vóór multi-tool.
export type OnboardingStap = {
  key: "eersteRekentool" | "catalogus" | "gepubliceerd";
  titel: string;
  beschrijving: string;
  href: string;
  voltooid: boolean;
};

export function bouwOnboardingStappen({
  heeftRekentool,
  heeftCatalogusItem,
  heeftGepubliceerdeTool,
  eersteToolHref,
}: {
  heeftRekentool: boolean;
  heeftCatalogusItem: boolean;
  heeftGepubliceerdeTool: boolean;
  // Waar "voeg je eerste product toe" en "publiceer" naartoe linken — de
  // eerste (of enige) tool van het bedrijf, of het toolsoverzicht als er nog
  // geen tool bestaat.
  eersteToolHref: string;
}): OnboardingStap[] {
  return [
    {
      key: "eersteRekentool",
      titel: "Maak je eerste rekentool",
      beschrijving: "Geef 'm een naam — je richt de rest zo in.",
      href: "/dashboard/tools/nieuw",
      voltooid: heeftRekentool,
    },
    {
      key: "catalogus",
      titel: "Voeg je eerste product toe",
      beschrijving: "Zo kunnen klanten direct een prijsindicatie berekenen.",
      href: `${eersteToolHref}/producten`,
      voltooid: heeftCatalogusItem,
    },
    {
      key: "gepubliceerd",
      titel: "Publiceer je rekentool",
      beschrijving: "Zet 'm live zodat klanten hem kunnen gebruiken.",
      href: `${eersteToolHref}/publiceren`,
      voltooid: heeftGepubliceerdeTool,
    },
  ];
}
