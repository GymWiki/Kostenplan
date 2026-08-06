"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { PRODUCT_ICONS, PRODUCT_ICON_CATEGORIES, PRODUCT_ICON_KEYWORDS, getProductIcon } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";

// "BrickWall" -> "brick wall", zodat zoeken op een los woord ("wall") ook
// een match geeft op een samengestelde iconnaam, niet alleen op een exacte
// prefix.
function humanize(pascalName: string) {
  return pascalName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

// Zoekt zowel in de (Engelse) iconnaam als in de Nederlandse trefwoorden uit
// PRODUCT_ICON_KEYWORDS — zonder dat laatste vindt "douche" bijvoorbeeld
// nooit ShowerHead, en "schutting" nooit Fence.
function matchesQuery(iconName: string, query: string) {
  if (!query) return true;
  if (humanize(iconName).includes(query)) return true;
  return (PRODUCT_ICON_KEYWORDS[iconName] ?? "").includes(query);
}

export function IconPicker({
  name,
  defaultValue,
  onChange,
}: {
  name: string;
  defaultValue?: string | null;
  // Optioneel: het hidden input hieronder wisselt van waarde via een JS
  // state-setter, niet via een klik/change op het input zelf — dat
  // bubbelt niet als DOM change-event naar een omliggend <form>. Een
  // aanroeper die op elke wijziging wil reageren (bijv. autosave) heeft
  // dus deze expliciete callback nodig i.p.v. te vertrouwen op form-brede
  // onChange-bubbling.
  onChange?: (value: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("alle");
  const SelectedIcon = getProductIcon(selected);

  function select(value: string | null) {
    setSelected(value);
    setOpen(false);
    onChange?.(value);
  }

  const q = query.trim().toLowerCase();
  const visibleIcons = useMemo(() => {
    return PRODUCT_ICON_CATEGORIES.filter((cat) => category === "alle" || cat.label === category).flatMap(
      (cat) => cat.icons.filter((iconName) => matchesQuery(iconName, q))
    );
  }, [category, q]);

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={selected ?? ""} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 w-fit items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors hover:bg-secondary cursor-pointer"
      >
        {SelectedIcon ? (
          // eslint-disable-next-line react-hooks/static-components -- stable lookup from a module-level icon map, not a new component
          <SelectedIcon className="h-4 w-4 text-primary" />
        ) : (
          <span className="h-4 w-4 rounded-sm border border-dashed border-muted-foreground" />
        )}
        {SelectedIcon ? "Icoon wijzigen" : "Kies een icoon (optioneel)"}
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam, bijv. schutting, douche, tegel..."
              autoComplete="off"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("alle")}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                category === "alle"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              Alle
            </button>
            {PRODUCT_ICON_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setCategory(cat.label)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  category === cat.label
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid max-h-72 grid-cols-5 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-6">
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="Geen icoon"
              aria-pressed={selected === null}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-md border transition-colors cursor-pointer",
                selected === null
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              <X className="h-4 w-4" />
            </button>
            {visibleIcons.map((iconName) => {
              const Icon = PRODUCT_ICONS[iconName];
              const isSelected = selected === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => select(iconName)}
                  aria-label={iconName}
                  aria-pressed={isSelected}
                  title={iconName}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-md border transition-colors cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            {visibleIcons.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                Geen icoon gevonden voor &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
