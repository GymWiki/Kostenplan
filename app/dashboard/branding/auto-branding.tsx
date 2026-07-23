"use client";

import { useState } from "react";
import { Loader2, Sparkles, Info } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { lettertypeOpties } from "@/app/lib/fonts";
import type { Lettertype } from "@/app/generated/prisma/client";

// Wat de branding-form nodig heeft om toe te passen — alleen de velden die
// de gebruiker heeft aangevinkt worden meegegeven, de rest van het
// formulier blijft ongemoeid. Sleutels komen 1-op-1 overeen met de
// bestaande Branding-velden (zie prisma/schema.prisma en brandingSchema).
export type AutoBrandingResult = {
  primaireKleur?: string;
  lettertype?: Lettertype;
  logoUrl?: string;
  customTitel?: string;
  welkomstTekst?: string;
};

type ExtractApiResponse =
  | {
      success: true;
      primaryColor: string;
      secondaryColor?: string;
      textOnPrimary: string;
      fontFamily: string | null;
      lettertype: Lettertype;
      logoUrl: string | null;
      companyName: string | null;
      title: string;
      titleAlternative?: string;
      subtitle: string;
      source: "theme-color" | "logo" | "css" | "fallback";
      confidence: "high" | "medium" | "low";
    }
  | { success: false; error: string; confidence: "low" };

type SuccessResult = Extract<ExtractApiResponse, { success: true }>;

export function AutoBranding({ onApply }: { onApply: (result: AutoBrandingResult) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);
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

  function handleApplied() {
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
          Vul je website-URL in en wij stellen logo, kleuren, lettertype en teksten voor op basis
          van je huidige website.
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
          <AutoBrandingPreview
            result={result}
            applied={applied}
            onApply={onApply}
            onApplied={handleApplied}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AutoBrandingPreview({
  result,
  applied,
  onApply,
  onApplied,
  onCancel,
}: {
  result: SuccessResult;
  applied: boolean;
  onApply: (result: AutoBrandingResult) => void;
  onApplied: () => void;
  onCancel: () => void;
}) {
  const lettertypeLabel =
    lettertypeOpties.find((o) => o.value === result.lettertype)?.label ?? result.lettertype;

  // Elk gevonden veld is los toepasbaar (standaard aan) — zo overschrijft
  // bijv. een matige logo-detectie niet een logo dat de vakman al
  // zorgvuldig had geüpload, als die het vinkje uitzet.
  const [applyPrimary, setApplyPrimary] = useState(true);
  const [applyLettertype, setApplyLettertype] = useState(true);
  const [applyLogo, setApplyLogo] = useState(Boolean(result.logoUrl));
  const [applyTitle, setApplyTitle] = useState(true);
  const [applySubtitle, setApplySubtitle] = useState(true);
  const [useAlternativeTitle, setUseAlternativeTitle] = useState(false);

  const chosenTitle = useAlternativeTitle && result.titleAlternative ? result.titleAlternative : result.title;

  function handleApply() {
    onApply({
      ...(applyPrimary ? { primaireKleur: result.primaryColor } : {}),
      ...(applyLettertype ? { lettertype: result.lettertype } : {}),
      ...(applyLogo && result.logoUrl ? { logoUrl: result.logoUrl } : {}),
      ...(applyTitle ? { customTitel: chosenTitle } : {}),
      ...(applySubtitle ? { welkomstTekst: result.subtitle } : {}),
    });
    onApplied();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/30 p-4">
      {result.confidence === "low" && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          We hebben een inschatting gemaakt — controleer of de kleuren kloppen.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex flex-col gap-4">
          <CheckField checked={applyPrimary} onChange={setApplyPrimary} label="Kleuren">
            <div className="flex gap-4">
              <Swatch label="Primair" hex={result.primaryColor} />
              {result.secondaryColor && <Swatch label="Secundair" hex={result.secondaryColor} />}
            </div>
          </CheckField>

          <CheckField checked={applyLettertype} onChange={setApplyLettertype} label="Lettertype">
            <p className="text-sm text-foreground">
              {lettertypeLabel}
              {result.fontFamily && (
                <span className="text-muted-foreground"> (gevonden: {result.fontFamily})</span>
              )}
            </p>
          </CheckField>

          {result.logoUrl && (
            <CheckField checked={applyLogo} onChange={setApplyLogo} label="Logo">
              {/* eslint-disable-next-line @next/next/no-img-element -- eigen Supabase Storage-URL, geen lokaal asset */}
              <img
                src={result.logoUrl}
                alt="Gevonden logo"
                className="h-12 w-auto max-w-[160px] rounded-md border border-border bg-white object-contain p-1"
              />
            </CheckField>
          )}

          <CheckField checked={applyTitle} onChange={setApplyTitle} label="Titel">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-foreground">{result.title}</p>
              {result.titleAlternative && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={useAlternativeTitle}
                    onChange={(e) => setUseAlternativeTitle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  Gebruik in plaats daarvan: &ldquo;{result.titleAlternative}&rdquo;
                </label>
              )}
            </div>
          </CheckField>

          <CheckField checked={applySubtitle} onChange={setApplySubtitle} label="Subtitel">
            <p className="text-sm text-foreground">{result.subtitle}</p>
          </CheckField>

          {result.companyName && (
            <p className="text-xs text-muted-foreground">
              Herkende bedrijfsnaam (gebruikt in de subtitel): {result.companyName}
            </p>
          )}
        </div>

        <RekentoolPreview
          primaryColor={result.primaryColor}
          textOnPrimary={result.textOnPrimary}
          logoUrl={applyLogo ? result.logoUrl : null}
          title={chosenTitle}
          subtitle={result.subtitle}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="button" size="sm" onClick={handleApply} disabled={applied}>
          {applied ? "Toegepast" : "Toepassen"}
        </Button>
      </div>
      {applied && (
        <p className="text-xs text-muted-foreground">
          Toegepast op de aangevinkte velden hieronder — pas eventueel nog bij en klik onderaan op
          &ldquo;Branding opslaan&rdquo; om te bevestigen.
        </p>
      )}
    </div>
  );
}

// Elk voorstel-veld: label + checkbox (standaard aan) + inhoud. Alleen
// gerenderd voor velden die daadwerkelijk gevonden zijn — geen lege
// swatches of placeholders voor ontbrekende data.
function CheckField({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-input"
      />
      <span className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {children}
      </span>
    </label>
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
// styling en teksten ogen, geen echte rekentool-instantie.
function RekentoolPreview({
  primaryColor,
  textOnPrimary,
  logoUrl,
  title,
  subtitle,
}: {
  primaryColor: string;
  textOnPrimary: string;
  logoUrl: string | null;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="w-full max-w-xs overflow-hidden rounded-lg border border-border shadow-sm" aria-hidden="true">
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium"
        style={{ backgroundColor: primaryColor, color: textOnPrimary }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- eigen Supabase Storage-URL, geen lokaal asset
          <img src={logoUrl} alt="" className="h-5 w-5 rounded bg-white object-contain p-0.5" />
        ) : (
          <span className="h-5 w-5 rounded bg-white/20" />
        )}
        <span className="truncate">Jouw rekentool</span>
      </div>
      <div className="flex flex-col gap-1.5 bg-card p-3">
        <p className="truncate text-xs font-semibold text-foreground">{title}</p>
        <p className="line-clamp-2 text-[11px] text-muted-foreground">{subtitle}</p>
        <div className="mt-1 h-2 w-3/4 rounded bg-secondary" />
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
