"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MiniSearch from "minisearch";
import { Search, X } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";
import type { ZoekResultaat } from "@/app/api/search-index/route";

// Zwaardere helft van SearchDialog — bevat minisearch, alleen dynamisch
// geladen (zie search-dialog.tsx) zodra iemand daadwerkelijk zoekt, i.p.v.
// dat elke marketingpagina die de header rendert dit altijd meestuurt (Fase
// 7 van het verbeterplan, P-01).
export function SearchDialogContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  // Start al op "true": dit component mount uitsluitend wanneer de dialoog
  // opent, en haalt dan altijd meteen de index op — er is geen tak waarin
  // dat niet gebeurt, dus de eerste `setLaden(true)` hoefde niet als
  // synchrone call in het effect zelf te staan (dat triggert een vermijdbare
  // extra render, zie react-hooks/set-state-in-effect).
  const [laden, setLaden] = useState(true);
  const [engine, setEngine] = useState<MiniSearch<ZoekResultaat> | null>(null);
  const [resultaten, setResultaten] = useState<ZoekResultaat[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function zoek(waarde: string, motor: MiniSearch<ZoekResultaat> | null) {
    const trimmed = waarde.trim();
    if (!motor || trimmed.length === 0) {
      setResultaten([]);
      return;
    }
    setResultaten(motor.search(trimmed).slice(0, 8) as unknown as ZoekResultaat[]);
  }

  // Dit component bestaat alleen zolang de dialoog open is (zie
  // search-dialog.tsx: `{open && <SearchDialogContent .../>}`) — het
  // mounten HIER is het "geopend"-moment, dus de eenmalige index-fetch +
  // focus hoort in een mount-effect, niet in een klik-handler (die leeft nu
  // een niveau hoger, waar minisearch nog niet geladen is).
  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/search-index")
      .then((res) => res.json())
      .then((items: ZoekResultaat[]) => {
        const mini = new MiniSearch<ZoekResultaat>({
          fields: ["title", "description"],
          storeFields: ["title", "description", "href", "type"],
          searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 2 } },
        });
        mini.addAll(items);
        setEngine(mini);
      })
      .finally(() => setLaden(false));
  }, []);

  function handleQueryChange(waarde: string) {
    setQuery(waarde);
    zoek(waarde, engine);
  }

  return (
    <Overlay open onClose={onClose} ariaLabel="Zoeken">
      <div className="mx-auto mt-24 flex w-full max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Zoek in kennisbank, functionaliteiten en meer…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {laden && <p className="px-3 py-4 text-sm text-muted-foreground">Zoekindex laden…</p>}
          {!laden && query.trim().length > 0 && resultaten.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">Niets gevonden voor &ldquo;{query}&rdquo;.</p>
          )}
          {resultaten.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className={cn("flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary")}
            >
              <span className="text-xs font-medium text-primary">{item.type}</span>
              <span className="font-medium text-foreground">{item.title}</span>
              <span className="truncate text-sm text-muted-foreground">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
