import {
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Wrench,
  Package,
  Palette,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overzicht", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  {
    href: "/dashboard/instellingen",
    label: "Kosteninstellingen",
    icon: SlidersHorizontal,
  },
  { href: "/dashboard/diensten", label: "Diensten", icon: Wrench },
  { href: "/dashboard/producten", label: "Producten", icon: Package },
  { href: "/dashboard/branding", label: "Branding", icon: Palette },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
];
