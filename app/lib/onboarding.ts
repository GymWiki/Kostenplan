// Onboarding-checklist op het dashboard-overzicht. De eerste twee stappen
// worden altijd live afgeleid van bestaande data (nooit apart opgeslagen —
// zie prisma/schema.prisma bij User.onboardingVoltooid voor de reden).
export type OnboardingStap = {
  key: "bedrijfsgegevens" | "catalogus" | "portaal";
  titel: string;
  beschrijving: string;
  href: string;
  // Alleen de portaal-stap opent in een nieuw tabblad (het is de publieke,
  // externe rekentool-URL, niet een interne dashboardpagina).
  extern: boolean;
  voltooid: boolean;
};

export function bouwOnboardingStappen({
  heeftBedrijfsgegevens,
  heeftCatalogusItem,
  heeftPortaalBekeken,
  portalUrl,
}: {
  heeftBedrijfsgegevens: boolean;
  heeftCatalogusItem: boolean;
  heeftPortaalBekeken: boolean;
  portalUrl: string;
}): OnboardingStap[] {
  return [
    {
      key: "bedrijfsgegevens",
      titel: "Vul je bedrijfsgegevens in",
      beschrijving: "Voeg je logo en telefoonnummer toe zodat klanten je herkennen.",
      href: "/dashboard/branding",
      extern: false,
      voltooid: heeftBedrijfsgegevens,
    },
    {
      key: "catalogus",
      titel: "Voeg je eerste product of dienst toe",
      beschrijving: "Zo kunnen klanten direct een prijsindicatie berekenen.",
      href: "/dashboard/diensten",
      extern: false,
      voltooid: heeftCatalogusItem,
    },
    {
      key: "portaal",
      titel: "Bekijk je live rekentool",
      beschrijving: "Zie hoe jouw rekentool eruitziet voor je klanten.",
      href: portalUrl,
      extern: true,
      voltooid: heeftPortaalBekeken,
    },
  ];
}
