"use client";

import Link from "next/link";
import { trackKlik, type KlikActie, type KlikBron } from "@/app/lib/landing/track";
import { cn } from "@/app/lib/cn";

const STIJL = {
  oker: "border-transparent bg-lp-oker text-lp-inkt shadow-[0_10px_24px_-10px_rgba(125,90,16,0.55)] hover:bg-lp-oker-licht",
  bos: "border-transparent bg-lp-bos-800 text-white shadow-[0_10px_24px_-12px_rgba(18,52,37,0.7)] hover:bg-lp-bos-900",
  lijn: "border-lp-lijn bg-lp-wit text-lp-inkt hover:border-lp-rand",
  lijnLicht: "border-lp-papier bg-transparent text-lp-papier hover:bg-lp-papier hover:text-lp-bos-900",
} as const;

// Link in knopvorm die een klik meet (zie app/lib/landing/track.ts).
export function CtaLink({
  href,
  bron,
  actie = "cta",
  pakket,
  stijl = "oker",
  pijl = false,
  className,
  children,
}: {
  href: string;
  bron: KlikBron;
  actie?: KlikActie;
  pakket?: string;
  stijl?: keyof typeof STIJL;
  pijl?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => trackKlik(bron, actie, pakket ? { pakket } : undefined)}
      className={cn(
        "group/cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 py-2 text-center text-base font-semibold transition-[background-color,color,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-px active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        STIJL[stijl],
        className
      )}
    >
      {children}
      {pijl && (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M2 8h11M9 4l4 4-4 4" />
        </svg>
      )}
    </Link>
  );
}
