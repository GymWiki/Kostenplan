"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/cn";
import { parseAdresInvoer, type AdresRuw } from "@/app/lib/werkgebied/adres-invoer";
import { zoekAdressen, zoekPostcodeHuisnummer, type PdokAdres } from "@/app/lib/werkgebied/pdok";

export type AdresKeuze =
  // Een gevonden adres bij PDOK.
  | { soort: "gevonden"; adres: PdokAdres; ruw: AdresRuw }
  // PDOK is niet bereikbaar: wel een geldige postcode en huisnummer, niet gecontroleerd.
  | { soort: "niet-gecontroleerd"; ruw: AdresRuw }
  // Postcode en huisnummer horen niet bij een bestaand adres.
  | { soort: "onbekend"; ruw: AdresRuw }
  // Nog niet af (of leeg).
  | { soort: "leeg" };

// Eén invoerveld voor postcode en huisnummer met autocomplete via de gratis PDOK Locatieserver. Typ "8011 AB 12"
// en kies een adres, of laat het zelf zoeken zodra postcode en huisnummer compleet zijn.
export function AdresZoeker({
  id,
  beginTekst = "",
  onKeuze,
  placeholder = "bijv. 8011 AB 12",
  className,
  zoeken = zoekAdressen,
  opzoeken = zoekPostcodeHuisnummer,
}: {
  id: string;
  beginTekst?: string;
  onKeuze: (k: AdresKeuze) => void;
  placeholder?: string;
  className?: string;
  // Te vervangen in tests.
  zoeken?: typeof zoekAdressen;
  opzoeken?: typeof zoekPostcodeHuisnummer;
}) {
  const [tekst, setTekst] = useState(beginTekst);
  const [lijst, setLijst] = useState<PdokAdres[]>([]);
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [status, setStatus] = useState<"idle" | "gevonden" | "onbekend" | "storing">("idle");
  const [actief, setActief] = useState(-1);
  const teller = useRef(0);
  const lijstId = useId();
  const kies = useRef(onKeuze);
  useEffect(() => {
    kies.current = onKeuze;
  }, [onKeuze]);

  useEffect(() => {
    const t = tekst.trim();
    const nummer = ++teller.current;
    if (t.length < 3) {
      setLijst([]);
      setStatus("idle");
      setBezig(false);
      return;
    }
    setBezig(true);
    const timer = setTimeout(async () => {
      const ruw = parseAdresInvoer(t);
      const [suggesties, exact] = await Promise.all([zoeken(t), ruw ? opzoeken(ruw.postcode, ruw.huisnummer, ruw.toevoeging) : Promise.resolve(null)]);
      if (nummer !== teller.current) return; // er is intussen verder getypt
      setBezig(false);
      if (suggesties.ok) setLijst(suggesties.waarde);
      else setLijst([]);
      if (ruw && exact) {
        if (!exact.ok) {
          setStatus("storing");
          kies.current({ soort: "niet-gecontroleerd", ruw });
        } else if (exact.waarde) {
          setStatus("gevonden");
          kies.current({ soort: "gevonden", adres: exact.waarde, ruw });
        } else {
          setStatus("onbekend");
          kies.current({ soort: "onbekend", ruw });
        }
      } else {
        setStatus(suggesties.ok ? "idle" : "storing");
        kies.current({ soort: "leeg" });
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [tekst, zoeken, opzoeken]);

  function neem(a: PdokAdres) {
    const ruw = parseAdresInvoer(`${a.postcode} ${a.huisnummer}`) ?? { postcode: a.postcode.replace(/\s/g, ""), huisnummer: a.huisnummer, toevoeging: "" };
    setTekst(`${a.postcode.replace(/^(\d{4})\s*([A-Za-z]{2})$/, "$1 $2")} ${a.huisnummer}`);
    setOpen(false);
    setLijst([]);
    setStatus("gevonden");
    kies.current({ soort: "gevonden", adres: a, ruw });
  }

  function toets(e: React.KeyboardEvent) {
    if (!open || lijst.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActief((i) => Math.min(lijst.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActief((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && actief >= 0) {
      e.preventDefault();
      neem(lijst[actief]);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <Input
        id={id}
        value={tekst}
        autoComplete="off"
        autoCapitalize="characters"
        inputMode="text"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && lijst.length > 0}
        aria-controls={lijstId}
        aria-autocomplete="list"
        onChange={(e) => {
          setTekst(e.target.value);
          setOpen(true);
          setActief(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={toets}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
        {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "gevonden" ? <Check className="h-4 w-4 text-primary" /> : status === "storing" ? <TriangleAlert className="h-4 w-4 text-warning" /> : null}
      </span>
      {open && lijst.length > 0 && (
        <ul id={lijstId} role="listbox" aria-label="Adressen" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {lijst.map((a, i) => (
            <li key={a.weergavenaam + i} role="option" aria-selected={i === actief}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => neem(a)} className={cn("flex min-h-11 w-full cursor-pointer items-center px-3 py-2 text-left text-base text-foreground hover:bg-secondary", i === actief && "bg-secondary")}>
                {a.weergavenaam}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
