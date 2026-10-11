"use client";

import Link from "next/link";
import { trackKlik, type KlikActie, type KlikBron } from "@/app/lib/landing/track";
import { cn } from "@/app/lib/cn";

const STIJL = {
  oker: "bg-lp-oker text-lp-inkt hover:bg-lp-oker-licht border-lp-inkt",
  bos: "bg-lp-bos-800 text-white hover:bg-lp-bos-900 border-lp-bos-800",
  lijn: "bg-transparent text-lp-inkt hover:bg-lp-papier-2 border-lp-inkt",
  lijnLicht: "bg-transparent text-lp-papier hover:bg-lp-papier hover:text-lp-bos-900 border-lp-papier",
} as const;

// Link in knopvorm die een klik meet (zie app/lib/landing/track.ts).
export function CtaLink({
  href,
  bron,
  actie = "cta",
  pakket,
  stijl = "oker",
  className,
  children,
}: {
  href: string;
  bron: KlikBron;
  actie?: KlikActie;
  pakket?: string;
  stijl?: keyof typeof STIJL;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => trackKlik(bron, actie, pakket ? { pakket } : undefined)}
      className={cn(
        "inline-flex min-h-12 items-center rounded-lg justify-center gap-2 border-[1.5px] px-6 py-2 text-center text-base font-semibold transition-colors duration-150",
        STIJL[stijl],
        className
      )}
    >
      {children}
    </Link>
  );
}
