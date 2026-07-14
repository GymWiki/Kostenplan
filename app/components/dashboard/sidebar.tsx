"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";
import { navLinks } from "./nav-links";
import { Logo } from "@/app/components/ui/logo";
import { ExternalLink } from "lucide-react";

export function Sidebar({
  slug,
  onNavigate,
}: {
  slug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-foreground"
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
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        <a
          href={`/portaal/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Bekijk klantenportaal
        </a>
      </div>
    </nav>
  );
}
