"use client";

import { useState } from "react";
import { Loader2, Sparkles, Info } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { lettertypeOpties } from "@/app/lib/fonts";
import type { Lettertype } from "@/app/generated/prisma/client";

// Wat de branding-form nodig heeft om toe te passen — een subset van de
// volledige API-response (zie app/lib/branding-extract.ts), al vertaald
// naar de bestaande veldnamen/structuur van het Branding-datamodel.
export type AutoBrandingResult = {
  primaireKleur: string;
  lettertype: Lettertype;
};

type ExtractApiResponse =
  | {
      success: true;
      primaryColor: string;
      accentColor: string | null;
      textOnPrimary: string;
      fontFamily: string | null;
      lettertype: Lettertype;
      logoUrl: string | null;
      source: "theme-color" | "logo" | "css" | "fallback";
      confidence: "high" | "medium" | "low";
    }
  | { success: false; error: string; confidence: "low" };

export function AutoBranding({ onApply }: { onApply: (result: AutoBrandingResult) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<ExtractApiResponse, { success: true }> | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleExtract() {
    if (!url.trim()) return;
    setPending(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const response = await fetch("/api/branding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: ExtractApiResponse = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("We konden je website niet automatisch analyseren. Kies je kleuren hieronder handmatig.");
    } finally {
      setPending(false);
    }
  }

  function handleApply() {
    if (!result) return;
    onApply({ primaireKleur: result.primaryColor, lettertype: result.lettertype });
    setApplied(true);
  }

  function handleCancel() {
    setResult(null);
    setApplied(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Automatisch ophalen van je website
        </CardTitle>
        <CardDescription>
          Vul je website-URL in en wij stellen kleuren en lettertype voor op basis van je huidige
          huisstijl.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://jouwbedrijf.nl"
            disabled={pending}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleExtract();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={pending || !url.trim()} onClick={handleExtract}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Bezig met analyseren…
              </>
            ) : (
              "Haal mijn huisstijl op"
            )}
          </Button>
        </div>

        {error && (
          <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{error}</p>
        )}

        {result && (
          <AutoBrandingPreview result={result} applied={applied} onApply={handleApply} onCancel={handleCancel} />
        )}
      </CardContent>
    </Card>
  );
}

function AutoBrandingPreview({
  result,
  applied,
  onApply,
  onCancel,
}: {
  result: Extract<ExtractApiResponse, { success: true }>;
  applied: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const lettertypeLabel =
    lettertypeOpties.find((o) => o.value === result.lettertype)?.label ?? result.lettertype;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/30 p-4">
      {result.confidence === "low" && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          We hebben een inschatting gemaakt — controleer of de kleuren kloppen.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <Swatch label="Primaire kleur" hex={result.primaryColor} />
            {result.accentColor && <Swatch label="Accentkleur" hex={result.accentColor} />}
          </div>
          <p className="text-xs text-muted-foreground">
            Lettertype: <span className="font-medium text-foreground">{lettertypeLabel}</span>
            {result.fontFamily && (
              <>
                {" "}
                (gevonden: <span className="italic">{result.fontFamily}</span>)
              </>
            )}
          </p>
          {result.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- externe, onbekende host: next/image zou domeinconfig per klant-website vereisen.
            <img
              src={result.logoUrl}
              alt="Gevonden logo"
              className="h-12 w-auto max-w-[160px] rounded-md border border-border bg-white object-contain p-1"
            />
          )}
        </div>

        <RekentoolPreview primaryColor={result.primaryColor} textOnPrimary={result.textOnPrimary} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="button" size="sm" onClick={onApply} disabled={applied}>
          {applied ? "Toegepast" : "Toepassen"}
        </Button>
      </div>
      {applied && (
        <p className="text-xs text-muted-foreground">
          Toegepast op de velden hieronder — pas eventueel nog bij en klik onderaan op &ldquo;Branding
          opslaan&rdquo; om te bevestigen.
        </p>
      )}
    </div>
  );
}

function Swatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="h-10 w-10 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <span className="font-mono text-[11px] uppercase text-muted-foreground">{hex}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// Kleine, statische mockup van de rekentool (zelfde geest als de mockup op
// de marketing-homepage) — puur om meteen te laten zien hoe de gevonden
// kleuren ogen, geen echte rekentool-instantie.
function RekentoolPreview({ primaryColor, textOnPrimary }: { primaryColor: string; textOnPrimary: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm" aria-hidden="true">
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-medium"
        style={{ backgroundColor: primaryColor, color: textOnPrimary }}
      >
        <span>Jouw rekentool</span>
      </div>
      <div className="flex flex-col gap-2 bg-card p-3">
        <div className="h-2 w-3/4 rounded bg-secondary" />
        <div className="h-2 w-1/2 rounded bg-secondary" />
        <button
          type="button"
          tabIndex={-1}
          className="mt-1 w-full cursor-default rounded-md py-1.5 text-xs font-medium"
          style={{ backgroundColor: primaryColor, color: textOnPrimary }}
        >
          Offerte aanvragen
        </button>
      </div>
    </div>
  );
}
