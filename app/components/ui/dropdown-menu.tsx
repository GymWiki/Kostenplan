"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";

// Generiek "•••"-menu voor secundaire rij-acties (Deel 3/16 van de UI/UX-
// herontwerpopdracht: "verwijderen, dupliceren etc. mogen onder ••• staan").
// Bouwt voort op de bestaande Overlay-mechaniek (portal/Escape/scroll-lock),
// zelfde patroon als CompanySwitcher, maar met dynamische positionering
// t.o.v. de trigger-knop i.p.v. een vast punt — nodig omdat dit component in
// meerdere rijen tegelijk voorkomt (elke rij heeft zijn eigen trigger-positie).
export type DropdownMenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function DropdownMenu({
  items,
  ariaLabel = "Meer acties",
  align = "end",
  trigger,
  className,
}: {
  items: DropdownMenuItem[];
  ariaLabel?: string;
  align?: "start" | "end";
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [positie, setPositie] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPositie(
        align === "end"
          ? { top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) }
          : { top: rect.bottom + 4, left: rect.left }
      );
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          className
        )}
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>

      <Overlay open={open} onClose={() => setOpen(false)} ariaLabel={ariaLabel} backdropClassName="">
        {positie && (
          <div
            role="menu"
            style={{ top: positie.top, left: positie.left, right: positie.right }}
            className="fixed z-[110] w-52 rounded-lg border border-border bg-card p-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  item.disabled
                    ? "cursor-not-allowed opacity-50"
                    : item.destructive
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-secondary"
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </Overlay>
    </>
  );
}
