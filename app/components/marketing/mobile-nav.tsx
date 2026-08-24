"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { LinkButton } from "@/app/components/ui/button";
import { NAV_LINKS } from "./nav-links";

// Audit-bevinding MP-01 (kritiek): onder de sm-breakpoint (640px) verdwenen
// alle navigatielinks uit de marketingheader zonder enig alternatief —
// alleen zoeken, thema-toggle en "Start nu gratis" bleven bereikbaar op een
// telefoon. Zelfde drawer-patroon als het dashboard (zie
// app/components/dashboard/mobile-nav.tsx), hier met de marketingnavigatie
// + Inloggen/Start nu gratis in plaats van de dashboard-sidebar.
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden cursor-pointer"
        aria-label="Menu openen"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Overlay open={open} onClose={() => setOpen(false)} ariaLabel="Menu" backdropClassName="bg-black/40" className="sm:hidden">
        <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-card p-4 shadow-xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
            aria-label="Menu sluiten"
          >
            <X className="h-4 w-4" />
          </button>

          <nav className="mt-2 flex flex-1 flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <LinkButton href="/login" variant="outline" onClick={() => setOpen(false)}>
              Inloggen
            </LinkButton>
            <LinkButton href="/registreren" onClick={() => setOpen(false)}>
              Start nu gratis
            </LinkButton>
          </div>
        </div>
      </Overlay>
    </>
  );
}
