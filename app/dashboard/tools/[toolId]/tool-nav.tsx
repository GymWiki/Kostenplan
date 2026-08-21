"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  Package,
  Euro,
  Palette,
  Target,
  ClipboardList,
  Rocket,
  Code2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/cn";

// Tool-eigen navigatie (Deel 13 van de opdracht) — bewust een aparte,
// tweede navigatielaag onder de account-brede sidebar, zodat een gebruiker
// met meerdere rekentools altijd exact weet: "ik pas nu déze tool aan". Zie
// app/dashboard/tools/[toolId]/layout.tsx voor waar de toolnaam zelf
// (prominent, in de header) vandaan komt.
//
// De "Bouwer"-tab (Levering B, generieke calculator-bouwer) is hier bewust
// uitgeschakeld — komt later terug. De onderliggende route/code
// (app/dashboard/tools/[toolId]/bouwer) blijft gewoon bestaan.
const TOOL_NAV_ITEMS: { segment: string; label: string; icon: LucideIcon }[] = [
  { segment: "", label: "Overzicht", icon: LayoutDashboard },
  { segment: "calculator", label: "Calculator", icon: Eye },
  { segment: "producten", label: "Producten", icon: Package },
  { segment: "prijzen", label: "Prijzen", icon: Euro },
  { segment: "uiterlijk", label: "Uiterlijk", icon: Palette },
  { segment: "resultaat", label: "Resultaat", icon: Target },
  { segment: "aanvraagformulier", label: "Aanvraagformulier", icon: ClipboardList },
  { segment: "publiceren", label: "Publiceren", icon: Rocket },
  { segment: "embed", label: "Embed", icon: Code2 },
  { segment: "instellingen", label: "Instellingen", icon: Settings },
];

export function ToolNav({ toolId }: { toolId: string }) {
  const pathname = usePathname();
  const basis = `/dashboard/tools/${toolId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:pb-0">
      {TOOL_NAV_ITEMS.map((item) => {
        const href = item.segment ? `${basis}/${item.segment}` : basis;
        const active = item.segment ? pathname.startsWith(href) : pathname === basis;
        const Icon = item.icon;
        return (
          <Link
            key={item.segment}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
