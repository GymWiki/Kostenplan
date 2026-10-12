"use client";

import { cn } from "@/app/lib/cn";
import { useToetsenbordOpen } from "./use-mobiel";

// Vaste balk onderin voor de hoofdactie van een scherm, alleen < 768 px.
// `metTabbalk`: ligt boven de tabbalk (64 px); anders zit hij onderaan het
// scherm (op bewerkschermen waar de tabbalk weg is). Verdwijnt zolang het
// toetsenbord open is, zodat hij nooit bovenop het veld ligt.
export function StickyActiebalk({
  children,
  metTabbalk = false,
  className,
}: {
  children: React.ReactNode;
  metTabbalk?: boolean;
  className?: string;
}) {
  const toetsenbord = useToetsenbordOpen();
  // Gewoon op de plek zelf (position: fixed), niet via een portal: zo staat de
  // balk al in de server-HTML en hoeft de pagina er niet op te wachten.
  if (toetsenbord) return null;
  return (
    <div
      data-actiebalk
      className={cn(
        "fixed inset-x-0 z-40 border-t border-border bg-card/95 px-4 pt-3 backdrop-blur md:hidden",
        metTabbalk ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] pb-3" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">{children}</div>
    </div>
  );
}
