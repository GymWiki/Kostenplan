"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { PRODUCT_ICONS, PRODUCT_ICON_NAMES, getProductIcon } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";

export function IconPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const SelectedIcon = getProductIcon(selected);

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
        <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-card p-3">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setOpen(false);
            }}
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
          {PRODUCT_ICON_NAMES.map((iconName) => {
            const Icon = PRODUCT_ICONS[iconName];
            const isSelected = selected === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  setSelected(iconName);
                  setOpen(false);
                }}
                aria-label={iconName}
                aria-pressed={isSelected}
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
        </div>
      )}
    </div>
  );
}
