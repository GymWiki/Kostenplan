"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type MenuLink = { href: string; label: string };

// Menu voor kleine schermen: een paneel onder de zwevende header (geen portal, dus
// het blijft binnen de landingsstijl). Sluit met Escape en bij het kiezen van een link.
export function LpMenu({ links }: { links: MenuLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sluit = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", sluit);
    return () => document.removeEventListener("keydown", sluit);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lp-menu-paneel"
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-lp-inkt transition-colors hover:bg-lp-papier-2"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} /> : <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />}
      </button>
      {open && (
        <nav
          id="lp-menu-paneel"
          aria-label="Menu"
          className="lp-zacht-groot absolute left-3 right-3 top-full mt-2 flex flex-col gap-1 rounded-3xl border border-lp-lijn bg-lp-wit p-3 sm:left-6 sm:right-6"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-2xl px-4 text-base font-medium text-lp-inkt hover:bg-lp-papier-2">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-2xl px-4 text-base font-medium text-lp-inkt-2 hover:bg-lp-papier-2">
            Inloggen
          </Link>
        </nav>
      )}
    </div>
  );
}
