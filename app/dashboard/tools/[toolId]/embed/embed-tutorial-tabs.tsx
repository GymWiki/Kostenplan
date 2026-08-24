"use client";

import { useState } from "react";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { cn } from "@/app/lib/cn";

type Platform = {
  id: string;
  label: string;
  uitleg: string;
};

const PLATFORMS: Platform[] = [
  {
    id: "wordpress",
    label: "WordPress",
    uitleg:
      "Open de pagina of het bericht in de WordPress-editor, voeg een blok van het type “Aangepaste HTML” toe (of de HTML-widget als je Elementor of een andere paginabouwer gebruikt), en plak de code hieronder.",
  },
  {
    id: "wix",
    label: "Wix",
    uitleg:
      "Ga in de Wix-editor naar Toevoegen → Insluiten en meer → Aangepaste elementen → HTML iframe, sleep het element op je pagina en plak de code hieronder in het codevenster.",
  },
  {
    id: "squarespace",
    label: "Squarespace",
    uitleg:
      "Voeg op je pagina een “Code”-blok toe (via het plusje tussen secties), en plak de code hieronder in dat blok.",
  },
  {
    id: "jouwweb",
    label: "Jouwweb",
    uitleg:
      "Voeg op je pagina het element “HTML/insluiten” toe vanuit het elementenpaneel, en plak de code hieronder.",
  },
  {
    id: "overig",
    label: "Overige/eigen site",
    uitleg:
      "Plak de code hieronder direct in de HTML van je pagina, op de plek waar de rekentool moet verschijnen.",
  },
];

export function EmbedTutorialTabs({ embedCode }: { embedCode: string }) {
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              platform.id === p.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{platform.uitleg}</p>

      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground">
        <code>{embedCode}</code>
      </pre>
      <div>
        <CopyButton text={embedCode} label="Kopieer embedcode" />
      </div>
    </div>
  );
}
