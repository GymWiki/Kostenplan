"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const SearchDialogContent = dynamic(() => import("./search-dialog-content").then((m) => m.SearchDialogContent), {
  ssr: false,
});

// Contentzoekfunctie (Fase 9): zoekt binnen doelgroepen/kennisbank/
// features/blog en toont resultaten direct terwijl je typt. Alleen deze
// lichte trigger-knop staat in elke pagina die de header rendert; de
// zwaardere zoeklogica (minisearch, ~valt in een eigen JS-chunk) wordt pas
// gedownload zodra iemand daadwerkelijk op "Zoeken" klikt (audit-bevinding
// P-01) — zie search-dialog-content.tsx.
export function SearchDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Doorzoek de kennisbank"
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Zoeken…</span>
      </button>

      {open && <SearchDialogContent onClose={() => setOpen(false)} />}
    </>
  );
}
