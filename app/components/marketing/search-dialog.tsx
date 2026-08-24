"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import MiniSearch from "minisearch";
import { Search, X } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";
import type { ZoekResultaat } from "@/app/api/search-index/route";

// Contentzoekfunctie (Fase 9): zoekt binnen doelgroepen/kennisbank/
// features/blog en toont resultaten direct terwijl je typt. De index wordt
// lui (pas bij het openen) en één keer opgehaald via /api/search-index en
// daarna volledig client-side doorzocht met minisearch — geen
// serveraanvraag per toetsaanslag. De motor staat in state (niet in een
// ref) omdat de resultatenlijst rechtstreeks op elke toetsaanslag wordt
// bijgewerkt vanuit de invoer-handler, niet tijdens render zelf.
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [laden, setLaden] = useState(false);
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

  function openDialog() {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
    if (engine) return;
    setLaden(true);
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
        zoek(query, mini);
      })
      .finally(() => setLaden(false));
  }

  function closeDialog() {
    setOpen(false);
    setQuery("");
    setResultaten([]);
  }

  function handleQueryChange(waarde: string) {
    setQuery(waarde);
    zoek(waarde, engine);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Doorzoek de kennisbank"
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Zoeken…</span>
      </button>

      <Overlay open={open} onClose={closeDialog} ariaLabel="Zoeken">
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
              onClick={closeDialog}
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
                onClick={closeDialog}
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
    </>
  );
}
