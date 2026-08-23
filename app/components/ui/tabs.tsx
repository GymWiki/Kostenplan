"use client";

import { cn } from "@/app/lib/cn";

// Eén gedeeld tab-component i.p.v. de losse, telkens opnieuw handmatig
// gebouwde tab-balken die al op minstens vier plekken in de app voorkwamen
// (calculator-bouwer, onderdelen-bouwer, onderdeel-editor-overlay,
// embed-tutorial-tabs) — zelfde onderlijnstijl overal, één plek om aan te
// passen.
export type TabItem<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((tab) => {
        const actief = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={actief}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              actief
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
