import {
  LayoutDashboard,
  Wrench,
  Users,
  CreditCard,
  CircleUserRound,
  type LucideIcon,
} from "lucide-react";

// Account-brede navigatie (zie Levering A: Company blijft de account-/
// facturatie-/team-eenheid). Alles wat met één specifieke rekentool te maken
// heeft (Producten, Prijzen, Uiterlijk, …) zit sinds Levering A niet meer
// hier, maar in de tool-eigen navigatie — zie
// app/dashboard/tools/[toolId]/layout.tsx.
export const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overzicht", icon: LayoutDashboard },
  { href: "/dashboard/tools", label: "Rekentools", icon: Wrench },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/profiel", label: "Profiel", icon: CircleUserRound },
];
