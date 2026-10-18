"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Ruler } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input, Label } from "@/app/components/ui/input";
import { UnitInput } from "@/app/components/ui/unit-input";
import { cn } from "@/app/lib/cn";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { HOVENIER_PRESETS } from "@/app/lib/presets";
import { draftOpslag } from "@/app/lib/draft-opslag";
import { maakDraft } from "@/app/lib/draft-editor";
import { verkleinLogo } from "@/app/lib/logo-verklein";
import { normaliseerSite } from "@/app/lib/site";
import { parseGetal } from "@/app/lib/sjablonen";

const STANDAARD_GEKOZEN = ["bestrating", "schutting"];

type Huisstijl = {
  kleur?: string;
  bedrijfsnaam?: string;
  lettertype?: "MODERN" | "KLASSIEK" | "VRIENDELIJK" | "STOER";
  titel?: string;
  welkomst?: string;
  logoDataUrl?: string;
  logoMislukt: boolean;
};

// Haalt logo en kleuren op via het publieke endpoint. Mislukt het, dan stil
// terugvallen op neutrale kleuren: de hovenier kan alles zelf aanpassen.
async function haalHuisstijl(site: string): Promise<Huisstijl> {
  const mislukt: Huisstijl = { logoMislukt: true };
  try {
    const stop = new AbortController();
    const timer = window.setTimeout(() => stop.abort(), 20_000);
    const antwoord = await fetch("/api/branding/voorbeeld", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: site }),
      signal: stop.signal,
      credentials: "omit",
    }).finally(() => window.clearTimeout(timer));
    const data = (await antwoord.json()) as {
      success?: boolean;
      primaryColor?: string;
      lettertype?: Huisstijl["lettertype"];
      logoDataUrl?: string | null;
      companyName?: string | null;
      title?: string;
      subtitle?: string;
    };
    if (!data.success) return mislukt;
    let logoDataUrl: string | undefined;
    if (data.logoDataUrl) {
      const blob = await (await fetch(data.logoDataUrl)).blob();
      const klein = await verkleinLogo(blob);
      if (klein.ok) logoDataUrl = klein.dataUrl;
    }
    return {
      kleur: data.primaryColor && /^#[0-9a-fA-F]{6}$/.test(data.primaryColor) ? data.primaryColor : undefined,
      bedrijfsnaam: data.companyName ?? undefined,
      lettertype: data.lettertype,
      titel: data.title && data.title.length <= 120 ? data.title : undefined,
      welkomst: data.subtitle && data.subtitle.length <= 500 ? data.subtitle : undefined,
      logoDataUrl,
      logoMislukt: !logoDataUrl,
    };
  } catch {
    return mislukt;
  }
}

const abonneer = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

export function ProbeerFormulier({ siteStart }: { siteStart: string }) {
  const router = useRouter();
  const heeftVoorbeeld = useSyncExternalStore(abonneer, () => draftOpslag().lees().draft !== null, () => false);
  const [opnieuw, setOpnieuw] = useState(false);
  const [site, setSite] = useState(siteStart);
  const [gekozen, setGekozen] = useState<string[]>(STANDAARD_GEKOZEN);
  const [tarief, setTarief] = useState("180");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [ophalen, setOphalen] = useState<string | null>(null);
  // Mobiel: één vraag per scherm (0 website, 1 werkzaamheden, 2 tarief).
  const [stap, setStap] = useState(0);
  // "Overslaan" bewaart de tekst in het veld (die wis je niet stilletjes), maar die website telt dan niet mee. Typ je weer, dan wel.
  const [overgeslagen, setOvergeslagen] = useState(false);
  const [siteFout, setSiteFout] = useState<string | null>(null);
  const cache = useRef<{ site: string; belofte: Promise<Huisstijl> } | null>(null);

  const ophalenVoor = (naam: string) => {
    if (cache.current?.site === naam) return cache.current.belofte;
    setOphalen(naam);
    const belofte = haalHuisstijl(naam).finally(() => setOphalen((n) => (n === naam ? null : n)));
    cache.current = { site: naam, belofte };
    return belofte;
  };

  // /probeer?site=voorbeeld.nl: meteen beginnen met het ophalen van logo en kleuren.
  useEffect(() => {
    if (siteStart) void ophalenVoor(siteStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (heeftVoorbeeld && !opnieuw) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Je hebt al een voorbeeld gemaakt</h2>
        <p className="text-sm text-muted-foreground">Ga verder waar je gebleven was, of begin helemaal opnieuw.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => router.push("/probeer/editor")}>
            Verder met je voorbeeld
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              draftOpslag().wis();
              setOpnieuw(true);
            }}
          >
            Opnieuw beginnen
          </Button>
        </div>
      </div>
    );
  }

  const wissel = (id: string) => setGekozen((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const SITE_FOUT = "Vul een geldige website in, bijvoorbeeld jouwtuinbedrijf.nl, of kies Overslaan.";

  // Overslaan: altijd door naar de volgende stap, zonder website. Op een computer staan alle vragen onder elkaar: dan naar de volgende vraag.
  function overslaan() {
    setOvergeslagen(true);
    setSiteFout(null);
    if (window.matchMedia("(min-width: 768px)").matches) document.querySelector<HTMLInputElement>("input[name=preset]")?.focus();
    else setStap(1);
  }

  // Verder (mobiel, stap 1): alleen met een geldige website.
  function verderNaSite() {
    const naam = normaliseerSite(site);
    if (!naam) return setSiteFout(SITE_FOUT);
    setSiteFout(null);
    setOvergeslagen(false);
    void ophalenVoor(naam);
    setStap(1);
  }

  async function maak(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    // Een ingevulde maar ongeldige website (en niet overgeslagen): niet stilletjes negeren.
    if (!overgeslagen && site.trim() !== "" && normaliseerSite(site) === "") {
      setStap(0);
      return setSiteFout(SITE_FOUT);
    }
    const bedrag = parseGetal(tarief, NaN);
    if (Number.isNaN(bedrag) || bedrag < 0 || bedrag > 10_000) return setFout("Vul een bedrag in voor je tarief per dagdeel.");
    if (gekozen.length === 0) return setFout("Kies minstens één onderdeel.");
    setBezig(true);
    const naam = overgeslagen ? "" : normaliseerSite(site);
    const stijl: Huisstijl = naam ? await ophalenVoor(naam) : { logoMislukt: false };
    const draft = maakDraft({
      presetIds: gekozen,
      tarief: bedrag,
      bedrijfsnaam: stijl.bedrijfsnaam,
      logoDataUrl: stijl.logoDataUrl,
      kleur: stijl.kleur,
      titel: stijl.titel,
      welkomst: stijl.welkomst,
      lettertype: stijl.lettertype,
    });
    draftOpslag().schrijf(draft);
    router.push(stijl.logoMislukt && naam ? "/probeer/editor?logo=mislukt" : "/probeer/editor");
  }

  const naamOphalen = ophalen;

  return (
    <form id="probeer-formulier" onSubmit={maak} className="flex flex-col gap-8 max-md:pb-24" noValidate>
      <div className="md:hidden" role="group" aria-label={`Stap ${stap + 1} van 3`}>
        <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Voortgang" aria-valuetext={`Stap ${stap + 1} van 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={stap + 1}>
          <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${((stap + 1) / 3) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Stap {stap + 1} van 3</p>
      </div>
      <section aria-labelledby="stap-site" className={cn("flex flex-col gap-2", stap !== 0 && "max-md:hidden")}>
        <h2 id="stap-site" className="text-lg font-semibold text-foreground">
          1. Wat is je website?
        </h2>
        <Label htmlFor="site">Website</Label>
        <Input
          id="site"
          name="site"
          inputMode="url"
          autoComplete="url"
          placeholder="Bijv. jouwtuinbedrijf.nl…"
          value={site}
          aria-invalid={siteFout ? true : undefined}
          aria-describedby={siteFout ? "site-fout" : "site-uitleg"}
          onChange={(e) => {
            setSite(e.target.value);
            setOvergeslagen(false);
            setSiteFout(null);
          }}
        />
        {siteFout && (
          <p id="site-fout" role="alert" className="text-sm font-medium text-destructive">
            {siteFout}
          </p>
        )}
        <p id="site-uitleg" className="text-sm text-muted-foreground">
          Dan halen we je logo en kleuren daar vandaan. Heb je geen website, of wil je dit later doen? Kies Overslaan.
        </p>
        <Button type="button" variant="ghost" className="-ml-3 h-11 w-fit px-3 text-sm font-semibold text-muted-foreground underline underline-offset-4" onClick={overslaan}>
          Overslaan
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
          {naamOphalen ? `Logo en kleuren ophalen van ${naamOphalen}…` : ""}
        </p>
      </section>

      <fieldset className={cn("flex flex-col gap-3", stap !== 1 && "max-md:hidden")}>
        <legend className="text-lg font-semibold text-foreground">2. Welke onderdelen doe je?</legend>
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

      <section aria-labelledby="stap-tarief" className={cn("flex flex-col gap-2", stap !== 2 && "max-md:hidden")}>
        <h2 id="stap-tarief" className="text-lg font-semibold text-foreground">
          3. Wat reken je per dagdeel?
        </h2>
        <Label htmlFor="tarief">Tarief per dagdeel (ochtend of middag)</Label>
        <UnitInput id="tarief" name="tarief" prefix="€" value={tarief} onChange={(e) => setTarief(e.target.value)} placeholder="Bijv. 180…" className="sm:max-w-[14rem]" />
        <p className="text-sm text-muted-foreground">Voorrijkosten en transport zetten we alvast voor je klaar. Die pas je later aan.</p>
      </section>

      {fout && stap !== 2 && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:hidden">
          {fout}
        </p>
      )}
      <div className={cn("flex flex-col gap-3", stap !== 2 && "max-md:hidden")}>
        {fout && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {fout}
          </p>
        )}
        <Button type="submit" size="lg" disabled={bezig || gekozen.length === 0} className="w-full sm:w-auto max-md:hidden">
          {bezig ? "Je rekentool wordt gemaakt…" : "Maak mijn rekentool"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Geen account nodig. Heb je al een account?{" "}
          <Link href="/login" className="font-semibold text-primary underline">
            Inloggen
          </Link>
        </p>
      </div>
      <StickyActiebalk>
        {stap > 0 && (
          <Button type="button" variant="outline" size="lg" className="shrink-0" onClick={() => { setFout(null); setStap((s) => s - 1); }}>
            Terug
          </Button>
        )}
        {/* Twee losse knoppen met eigen key: met één knop die van type wisselt, hergebruikt React hetzelfde DOM-element en
            werd "Volgende" tijdens dezelfde tik een submit-knop, waarna het formulier meteen verstuurd werd (#75). */}
        {stap < 2 && (
          <Button
            key="volgende"
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => {
              if (stap === 0) return verderNaSite();
              if (stap === 1 && gekozen.length === 0) return setFout("Kies minstens één onderdeel.");
              setFout(null);
              setStap((s) => s + 1);
            }}
          >
            {stap === 0 ? "Verder" : "Volgende"}
          </Button>
        )}
        {stap === 2 && (
          <Button key="maak" type="submit" form="probeer-formulier" size="lg" className="flex-1" disabled={bezig || gekozen.length === 0}>
            {bezig ? "Bezig…" : "Maak mijn rekentool"}
          </Button>
        )}
      </StickyActiebalk>
    </form>
  );
}
