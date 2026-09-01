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
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/cn";

// Tool-eigen navigatie (Deel 13 van de opdracht) — bewust een aparte,
// tweede navigatielaag onder de account-brede sidebar, zodat een gebruiker
// met meerdere rekentools altijd exact weet: "ik pas nu déze tool aan". Zie
// app/dashboard/tools/[toolId]/layout.tsx voor waar de toolnaam zelf
// (prominent, in de header) vandaan komt.
type ToolNavItem = { segment: string; label: string; icon: LucideIcon };

// Gegroepeerd (UI/UX-herontwerp bouwer, Deel 2) i.p.v. één platte lijst — een
// duidelijke "waar ben ik"-structuur (Calculator / Publiceren / Instellingen)
// helpt vooral op de Bouwer-pagina, waar de gebruiker al met veel andere
// hiërarchie te maken heeft.
const TOOL_NAV_GROUPS: { titel: string; items: ToolNavItem[] }[] = [
  {
    titel: "Calculator",
    items: [
      { segment: "", label: "Overzicht", icon: LayoutDashboard },
      { segment: "calculator", label: "Calculator", icon: Eye },
      // Levering B v2: de modulaire Onderdelen-bouwer (nieuwe tools) resp. de
      // bestaande generieke calculator-bouwer (oudere versie-1-tools) — zie
      // app/dashboard/tools/[toolId]/bouwer/page.tsx voor de branch. Altijd
      // zichtbaar, ook vóórdat een tool de engine gebruikt.
      { segment: "bouwer", label: "Bouwer", icon: Wand2 },
      { segment: "producten", label: "Producten", icon: Package },
      { segment: "prijzen", label: "Prijzen", icon: Euro },
      { segment: "uiterlijk", label: "Uiterlijk", icon: Palette },
      { segment: "resultaat", label: "Resultaat", icon: Target },
      { segment: "aanvraagformulier", label: "Aanvraagformulier", icon: ClipboardList },
    ],
  },
  {
    titel: "Publiceren",
    items: [
      { segment: "publiceren", label: "Publiceren", icon: Rocket },
      { segment: "embed", label: "Embed", icon: Code2 },
    ],
  },
  {
    titel: "Instellingen",
    items: [{ segment: "instellingen", label: "Instellingen", icon: Settings }],
  },
];

export function ToolNav({ toolId, verbergBouwer = false }: { toolId: string; verbergBouwer?: boolean }) {
  const pathname = usePathname();
  const basis = `/dashboard/tools/${toolId}`;

  // UX-audit punt 2: een tool die al via Producten is opgebouwd en nog nooit
  // een CalculatorConfig heeft gepubliceerd, laat hier de verwarrende
  // "Bouwer"-tab weg — anders staat er een tab naast Producten die een
  // misleidende lege staat toont voor een tool die al live staat. Zie de
  // gelijke conditie in app/dashboard/tools/[toolId]/bouwer/page.tsx en
  // layout.tsx (waar verbergBouwer berekend wordt).
  const groepen = verbergBouwer
    ? TOOL_NAV_GROUPS.map((groep) =>
        groep.titel === "Calculator"
          ? { ...groep, items: groep.items.filter((item) => item.segment !== "bouwer") }
          : groep
      )
    : TOOL_NAV_GROUPS;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px sm:flex-col sm:gap-4 sm:overflow-visible sm:border-b-0 sm:pb-0">
      {groepen.map((groep) => (
        <div key={groep.titel} className="flex gap-1 sm:flex-col sm:gap-0.5">
          <span className="hidden px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:block">{groep.titel}</span>
          {groep.items.map((item) => {
            const href = item.segment ? `${basis}/${item.segment}` : basis;
            const active = item.segment ? pathname.startsWith(href) : pathname === basis;
            const Icon = item.icon;
            return (
              <Link
                key={item.segment}
                href={href}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {/* Alleen op de verticale (sm+) staat — op de horizontale
                    scrollbare mobiele tabstrip zou een links-accent onder de
                    vinger verdwijnen; de bg-tint blijft daar het enige signaal. */}
                {active && (
                  <span className="absolute inset-y-1.5 left-0 hidden w-[3px] rounded-full bg-primary sm:block" aria-hidden="true" />
                )}
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
