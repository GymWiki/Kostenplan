"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";
import { navLinks } from "@/app/components/dashboard/nav-links";
import { useToetsenbordOpen } from "./use-mobiel";

// Routes waar de tabbalk plaatsmaakt voor de actiebalk van een bewerkscherm.
export function verbergtTabbalk(pad: string) {
  return /^\/dashboard\/tools\/[^/]+(\/|$)/.test(pad) && pad !== "/dashboard/tools/nieuw" || /^\/dashboard\/leads\/[^/]+\/offerte/.test(pad);
}

// Tabbalk onderin, alleen < 768 px: de vier hoofdonderdelen binnen
// duimbereik, met het aantal nieuwe leads op Leads.
export function Tabbalk({ nieuweLeads, profielWaarschuwing = 0 }: { nieuweLeads: number; profielWaarschuwing?: number }) {
  const pad = usePathname();
  const toetsenbord = useToetsenbordOpen();
  if (toetsenbord || verbergtTabbalk(pad)) return null;

  return (
    <nav
      aria-label="Hoofdmenu"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {navLinks.map((link) => {
          const actief = link.href === "/dashboard" ? pad === "/dashboard" : pad.startsWith(link.href);
          const Icon = link.icon;
          const badge = link.href === "/dashboard/leads" && nieuweLeads > 0 ? nieuweLeads : null;
          // Oranje: gegevens ontbreken voor offertes (Profiel → Bedrijfsgegevens).
          const waarschuwing = link.href === "/dashboard/profiel" && profielWaarschuwing > 0 ? profielWaarschuwing : null;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={actief ? "page" : undefined}
                className={cn(
                  "relative flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring",
                  actief ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={actief ? 2.4 : 2} />
                  {waarschuwing && (
                    <span
                      aria-label={`${waarschuwing} ${waarschuwing === 1 ? "gegeven ontbreekt" : "gegevens ontbreken"} voor offertes`}
                      className="absolute -right-3 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[11px] font-bold leading-none text-white"
                    >
                      {waarschuwing}
                    </span>
                  )}
                  {badge && (
                    <span
                      aria-label={`${badge} nieuwe ${badge === 1 ? "lead" : "leads"}`}
                      className="absolute -right-3 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
