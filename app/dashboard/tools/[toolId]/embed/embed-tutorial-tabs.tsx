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

export function EmbedTutorialTabs({
  embedCode,
  iframeCode = null,
  heeftContact = true,
}: {
  embedCode: string;
  iframeCode?: string | null;
  heeftContact?: boolean;
}) {
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Platform" className="flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`platform-tab-${p.id}`}
            aria-selected={platform.id === p.id}
            aria-controls={`platform-panel-${p.id}`}
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

      <p id={`platform-panel-${platform.id}`} role="tabpanel" aria-labelledby={`platform-tab-${platform.id}`} className="text-sm text-muted-foreground">
        {platform.uitleg}
      </p>

      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground">
        <code>{embedCode}</code>
      </pre>
      <div>
        <CopyButton text={embedCode} label="Kopieer insluitcode" />
      </div>
      <p className="text-sm text-muted-foreground">
        {heeftContact
          ? "Je bedrijfsnaam en de contactgegevens die je bij Uiterlijk laat zien, staan in de code. Laadt je rekentool een keer niet, dan krijgen bezoekers een kaart om je te bellen of te mailen."
          : "Zet bij Uiterlijk je telefoonnummer of e-mailadres aan. Dan krijgen bezoekers een kaart om je te bellen of te mailen als je rekentool een keer niet laadt."}
      </p>
      {iframeCode && (
        <details className="rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">Werkt de code hierboven niet op je website?</summary>
          <p className="mt-2 text-muted-foreground">
            Sommige websitebouwers halen scripts weg. Gebruik dan deze code. Je rekentool werkt hetzelfde.
          </p>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground">
            <code>{iframeCode}</code>
          </pre>
          <div className="mt-2">
            <CopyButton text={iframeCode} label="Kopieer deze code" />
          </div>
        </details>
      )}
    </div>
  );
}
