"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Sheet } from "@/app/components/ui/sheet";
import { useToast } from "@/app/components/ui/toast";
import { switchActiveCompanyAction } from "@/app/lib/actions/companies";
import { cn } from "@/app/lib/cn";
import { initialen } from "@/app/lib/profiel/samenvattingen";

export type WisselBedrijf = { id: string; naam: string; logoUrl: string | null; plan: string };

const MELDING_SLEUTEL = "kp-wissel-melding";
const DESKTOP = "(min-width: 768px)";

function useDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(DESKTOP);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false
  );
}

function Logo({ url, naam, grootte }: { url: string | null; naam: string; grootte: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- extern logo, afmetingen onbekend
    <img src={url} alt="" width={grootte} height={grootte} className="shrink-0 rounded-lg border border-border bg-white object-contain" style={{ width: grootte, height: grootte }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary" style={{ width: grootte, height: grootte, fontSize: grootte * 0.33 }} aria-hidden="true">
      {initialen(naam)}
    </span>
  );
}

// Kop van Profiel = de bedrijfswisselaar: logo (of initialen), bedrijfsnaam, domein en een wissel-icoon. Tikken opent
// op de telefoon een bottom sheet, op desktop een popover onder de kop, met al je bedrijven en "+ Bedrijf toevoegen".
export function ProfielKop({ actief, domein, bedrijven }: { actief: WisselBedrijf; domein: string | null; bedrijven: WisselBedrijf[] }) {
  const [open, setOpen] = useState(false);
  const [bezigId, setBezigId] = useState<string | null>(null);
  const [, start] = useTransition();
  const desktop = useDesktop();
  const wrap = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Na het wisselen (de pagina laadt opnieuw voor het nieuwe bedrijf; de kop start dan met een lege staat): melding tonen.
  useEffect(() => {
    try {
      const naam = sessionStorage.getItem(MELDING_SLEUTEL);
      if (naam) {
        sessionStorage.removeItem(MELDING_SLEUTEL);
        toast(`Je werkt nu in ${naam}`, "success");
      }
    } catch {
      // opslag niet beschikbaar: geen melding
    }
  }, [toast]);

  // Popover: Escape en buiten tikken sluiten.
  useEffect(() => {
    if (!open || !desktop) return;
    const buiten = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", esc);
    };
  }, [open, desktop]);

  function wissel(b: WisselBedrijf) {
    if (bezigId) return; // geen dubbele wissel bij dubbel tikken
    if (b.id === actief.id) return setOpen(false);
    setBezigId(b.id);
    try {
      sessionStorage.setItem(MELDING_SLEUTEL, b.naam);
    } catch {
      // opslag niet beschikbaar
    }
    const fd = new FormData();
    fd.set("companyId", b.id);
    fd.set("redirectTo", "profiel");
    start(async () => {
      try {
        await switchActiveCompanyAction(fd);
      } catch (e) {
        // redirect() gooit een speciale fout die Next afhandelt; alleen echte fouten komen hier terecht
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setBezigId(null);
        toast("Wisselen lukt nu niet. Probeer het opnieuw.", "error");
      }
    });
  }

  const lijst = (
    <div className="flex flex-col gap-2">
      <ul className="overflow-hidden rounded-xl border border-border">
        {bedrijven.map((b) => {
          const isActief = b.id === actief.id;
          const bezig = bezigId === b.id;
          return (
            <li key={b.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => wissel(b)}
                disabled={bezigId !== null && !bezig}
                aria-current={isActief ? "true" : undefined}
                aria-busy={bezig || undefined}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Logo url={b.logoUrl} naam={b.naam} grootte={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">{b.naam}</span>
                  <span className="block truncate text-sm text-muted-foreground">{b.plan}</span>
                </span>
                {bezig ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-label="Bezig met wisselen" /> : isActief ? <Check className="h-5 w-5 shrink-0 text-primary" aria-label="Actief bedrijf" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/dashboard/bedrijven/nieuw" className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-medium text-primary hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Plus className="h-5 w-5" aria-hidden="true" /> Bedrijf toevoegen
      </Link>
    </div>
  );

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-[72px] w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Logo url={actief.logoUrl} naam={actief.naam} grootte={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-foreground">{actief.naam}</span>
          {domein && <span className="block truncate text-sm text-muted-foreground">{domein}</span>}
          <span className="sr-only">Bedrijf wisselen</span>
        </span>
        <ChevronsUpDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {desktop ? (
        open && (
          <div role="dialog" aria-label="Bedrijf wisselen" className={cn("absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-border bg-card p-2 shadow-lg")}>
            {lijst}
          </div>
        )
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} title="Bedrijf wisselen">
          {lijst}
        </Sheet>
      )}
    </div>
  );
}
