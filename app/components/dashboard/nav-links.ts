import {
  LayoutDashboard,
  SlidersHorizontal,
  FolderTree,
  Wrench,
  Package,
  type LucideIcon,
} from "lucide-react";

export const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overzicht", icon: LayoutDashboard },
  {
    href: "/dashboard/instellingen",
    label: "Kosteninstellingen",
    icon: SlidersHorizontal,
  },
  { href: "/dashboard/categorieen", label: "Categorieën", icon: FolderTree },
  { href: "/dashboard/diensten", label: "Diensten", icon: Wrench },
  { href: "/dashboard/producten", label: "Producten", icon: Package },
];
