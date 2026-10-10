"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Ruler } from "lucide-react";
import { TurnstileVeld } from "@/app/components/auth/turnstile-veld";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { cn } from "@/app/lib/cn";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { meldGastGebeurtenisAction, startGastAction, type GastStartState } from "@/app/lib/actions/gast";

const STANDAARD_GEKOZEN = ["bestrating", "schutting"];

export function ProbeerFormulier({
  siteStart,
  metSiteParam,
  utm,
  verlopen,
}: {
  siteStart: string;
  metSiteParam: boolean;
  utm: { utm_source: string; utm_medium: string; utm_campaign: string };
  verlopen: boolean;
}) {
  const [state, formAction, pending] = useActionState<GastStartState, FormData>(startGastAction, null);
  const [site, setSite] = useState(siteStart);
  const [gekozen, setGekozen] = useState<string[]>(STANDAARD_GEKOZEN);
  const [captchaKlaar, setCaptchaKlaar] = useState(false);
  const [stap, setStap] = useState(0);

  useEffect(() => {
    void meldGastGebeurtenisAction("probeer_bekeken", { ...utm, metSiteParam });
  }, [utm, metSiteParam]);

  // Laadstatus tijdens het aanmaken.
  const stappen = [
    site.trim() ? `Logo en kleuren ophalen van ${site.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")}…` : null,
    "Onderdelen klaarzetten…",
    "Je rekentool opbouwen…",
  ].filter((s): s is string => s !== null);
  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => setStap((s) => Math.min(s + 1, stappen.length - 1)), 3000);
    return () => {
      window.clearInterval(t);
      setStap(0);
    };
  }, [pending, stappen.length]);

  const wissel = (id: string) => setGekozen((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="utm_source" value={utm.utm_source} />
      <input type="hidden" name="utm_medium" value={utm.utm_medium} />
      <input type="hidden" name="utm_campaign" value={utm.utm_campaign} />
      <input type="hidden" name="metSiteParam" value={metSiteParam ? "1" : "0"} />

      {verlopen && (
        <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
          Je vorige voorbeeld is verlopen. Maak gerust een nieuwe, dat kost twee minuten.
        </p>
      )}

      <section aria-labelledby="stap-site" className="flex flex-col gap-2">
        <h2 id="stap-site" className="text-lg font-semibold text-foreground">
          1. Wat is je website?
        </h2>
        <Label htmlFor="site">Website (niet verplicht)</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="site"
            name="site"
            inputMode="url"
            autoComplete="url"
            placeholder="Bijv. jouwtuinbedrijf.nl…"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="sm:flex-1"
          />
          <Button type="button" variant="outline" className="h-11" onClick={() => setSite("")}>
            Overslaan
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Dan halen we je logo en kleuren daar vandaan. Lukt dat niet, dan voeg je ze zelf toe.</p>
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-semibold text-foreground">2. Welke werkzaamheden doe je?</legend>
        <p className="-mt-1 text-sm text-muted-foreground">Kies er minstens één. Je past alles daarna zelf aan.</p>
        <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
          {HOVENIER_PRESETS.map((p) => {
            const aan = gekozen.includes(p.id);
            const Icoon = PRODUCT_ICONS[p.icoon] ?? Ruler;
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] px-3 py-2 text-base font-medium text-foreground transition-colors focus-within:ring-[3px] focus-within:ring-ring/35",
                    aan ? "border-primary bg-accent" : "border-input bg-card hover:bg-secondary"
                  )}
                >
                  <input type="checkbox" name="preset" value={p.id} checked={aan} onChange={() => wissel(p.id)} className="sr-only" />
                  <Icoon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words">{p.naam}</span>
                  {aan && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <section aria-labelledby="stap-tarief" className="flex flex-col gap-2">
        <h2 id="stap-tarief" className="text-lg font-semibold text-foreground">
          3. Wat reken je per dagdeel?
        </h2>
        <Label htmlFor="tarief">Tarief per dagdeel (ochtend of middag)</Label>
        <UnitInput id="tarief" name="tarief" prefix="€" defaultValue="180" placeholder="Bijv. 180…" className="sm:max-w-[14rem]" />
        <p className="text-sm text-muted-foreground">Voorrijkosten en transport zetten we alvast voor je klaar. Die pas je later aan.</p>
      </section>

      <TurnstileVeld onKlaar={setCaptchaKlaar} />

      <div className="flex flex-col gap-3">
        {state?.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending || gekozen.length === 0 || !captchaKlaar} className="w-full sm:w-auto">
          {pending ? "Bezig…" : "Maak mijn rekentool"}
        </Button>
        <p role="status" aria-live="polite" className="min-h-6 text-sm text-muted-foreground">
          {pending ? stappen[Math.min(stap, stappen.length - 1)] : ""}
        </p>
      </div>
    </form>
  );
}
