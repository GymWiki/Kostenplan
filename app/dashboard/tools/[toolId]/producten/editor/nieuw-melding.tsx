"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";

// Na het aanmaken: melding "[naam] staat nu in je rekentool" en daarna de
// ?nieuw=-parameter weghalen, zodat verversen de melding niet herhaalt.
export function NieuwMelding({ naam }: { naam: string | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const gemeld = useRef(false);

  useEffect(() => {
    if (!naam || gemeld.current) return;
    gemeld.current = true;
    toast(`${naam} staat nu in je rekentool`, "success");
    router.replace(pathname, { scroll: false });
  }, [naam, toast, router, pathname]);

  return null;
}
