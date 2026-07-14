import Image from "next/image";
import { cn } from "@/app/lib/cn";

// The logo mark (clipboard + calculator + leaf) reads well on a light
// background but its dark slate linework nearly disappears against the
// dark theme's near-black background — so it always sits on its own small
// white chip, regardless of site theme, rather than directly on
// bg-primary/bg-background like the old placeholder icon did.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-border",
        className
      )}
    >
      <Image
        src="/logo-mark.png"
        alt=""
        width={32}
        height={32}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
