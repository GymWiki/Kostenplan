"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";
import { navLinks } from "./nav-links";
import { Logo } from "@/app/components/ui/logo";

export function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2.5 px-2 pb-4 text-lg font-semibold text-foreground border-b border-border"
      >
        <Logo />
        Kostenplan
      </Link>

      {navLinks.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {/* Zwevend accentbalkje i.p.v. een echte border-l: dat laatste
                zou de rounded-md-hoeken van de actieve pil afplatten en de
                inhoud 1-2px laten opschuiven t.o.v. de inactieve items. */}
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" aria-hidden="true" />
            )}
            <Icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
