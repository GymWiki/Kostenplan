"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { cn } from "@/app/lib/cn";

export function SharePortalCard({
  portalUrl,
  embedCode,
}: {
  portalUrl: string;
  embedCode: string;
}) {
  const [tab, setTab] = useState<"link" | "embed">("link");

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-accent to-card">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setTab("link")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 transition-colors cursor-pointer",
              tab === "link"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Deel als link
          </button>
          <button
            type="button"
            onClick={() => setTab("embed")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 transition-colors cursor-pointer",
              tab === "embed"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Insluiten op je website
          </button>
        </div>

        {tab === "link" ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-accent-foreground">Jouw klantenportaal</p>
              <p className="mt-1 truncate text-lg font-semibold text-foreground">{portalUrl}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stuur deze link naar je klanten zodat ze zelf een kostenschatting kunnen maken.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <CopyButton text={portalUrl} label="Kopieer link" />
              <LinkButton href={portalUrl} target="_blank" variant="primary">
                <ExternalLink className="h-4 w-4" />
                Openen
              </LinkButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-accent-foreground">Insluitcode</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Plak deze code in de HTML van je website om de calculator direct te tonen. De
                hoogte past zich automatisch aan.
              </p>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground">
              <code>{embedCode}</code>
            </pre>
            <div>
              <CopyButton text={embedCode} label="Kopieer embedcode" className="w-full sm:w-auto" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
