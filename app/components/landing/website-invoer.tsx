"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { normaliseerSite } from "@/app/lib/site";
import { trackKlik, type KlikBron } from "@/app/lib/landing/track";
import { cn } from "@/app/lib/cn";

// "Jouw website" → /probeer?site=…. Werkt ook zonder JavaScript (gewoon een
// GET-formulier; /probeer normaliseert zelf). Met JavaScript valideren we eerst.
export function WebsiteInvoer({ bron, op = "licht", className }: { bron: KlikBron; op?: "licht" | "oker"; className?: string }) {
  const router = useRouter();
  const id = useId();
  const [waarde, setWaarde] = useState("");
  const [fout, setFout] = useState<string | null>(null);

  function verstuur(e: React.FormEvent) {
    e.preventDefault();
    const ruw = waarde.trim();
    const site = normaliseerSite(ruw);
    if (ruw && !site) return setFout("Dat lijkt geen website. Probeer bijvoorbeeld jouwbedrijf.nl.");
    setFout(null);
    trackKlik(bron, "website-invoer", { metSite: Boolean(site) });
    router.push(site ? `/probeer?site=${encodeURIComponent(site)}` : "/probeer");
  }

  return (
    <form action="/probeer" method="get" onSubmit={verstuur} noValidate className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-lp-inkt">
        Jouw website
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="site"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          value={waarde}
          onChange={(e) => setWaarde(e.target.value)}
          placeholder="jouwbedrijf.nl"
          aria-invalid={fout ? true : undefined}
          aria-describedby={`${id}-hulp`}
          className="h-12 w-full min-w-0 rounded-lg sm:flex-1 border-[1.5px] border-lp-rand bg-lp-wit px-3 text-base text-lp-inkt placeholder:text-lp-inkt-2"
        />
        <button
          type="submit"
          className={cn(
            "h-12 cursor-pointer whitespace-nowrap rounded-lg transition-[background-color,transform] duration-200 active:scale-[0.98] motion-reduce:transition-none border-[1.5px] px-5 text-base font-semibold",
            "border-lp-bos-900 bg-lp-bos-900 text-white hover:bg-lp-bos-950"
          )}
        >
          Haal mijn logo en kleuren op
        </button>
      </div>
      <p id={`${id}-hulp`} role={fout ? "alert" : undefined} className={cn("text-sm", fout ? "font-semibold text-red-800" : op === "oker" ? "text-lp-inkt" : "text-lp-inkt-2")}>
        {fout ?? "Je logo en kleuren komen er dan al in te staan. Geen account nodig."}
      </p>
    </form>
  );
}
