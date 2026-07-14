"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { updateBrandingAction } from "@/app/lib/actions/branding";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input, Label, Select, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { PhotoInput } from "@/app/components/ui/photo-input";
import { cn } from "@/app/lib/cn";
import { lettertypeOpties } from "@/app/lib/fonts";
import type { Branding, SubscriptionTier } from "@/app/generated/prisma/client";

export function BrandingForm({
  branding,
  subscriptionTier,
  email,
}: {
  branding: Branding;
  subscriptionTier: SubscriptionTier;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, null);
  const [toonTelefoonnummer, setToonTelefoonnummer] = useState(branding.toonTelefoonnummer);

  const magPersonaliserenUiterlijk = subscriptionTier !== "GRATIS";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Branding opgeslagen.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Visuele identiteit</CardTitle>
          <CardDescription>Je logo en huisstijlkleuren.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label>Logo</Label>
            <PhotoInput
              currentUrl={branding.logoUrl}
              name="logo"
              label="Logo"
              thumbnailClassName="h-16 w-16 shrink-0 rounded-md border border-border bg-white object-contain p-1"
            />
            <p className="text-xs text-muted-foreground">
              Wordt getoond bovenaan je rekentool in plaats van het Kostenplan-merkteken. JPG,
              PNG, WEBP of GIF, max 5MB.
            </p>
          </div>

          {!magPersonaliserenUiterlijk && (
            <p className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Kleuren en lettertype aanpassen kan vanaf het Plus-abonnement. Kies hierboven bij
              &ldquo;Huidig abonnement&rdquo; alvast Plus of Pro om ze te ontgrendelen.
            </p>
          )}

          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              !magPersonaliserenUiterlijk && "pointer-events-none opacity-50"
            )}
          >
            <ColorField
              label="Primaire kleur"
              name="primaireKleur"
              defaultValue={branding.primaireKleur}
              helper="Gebruikt voor knoppen, de header en acties — met witte tekst erop."
              warnLightAgainstWhite
            />
            <ColorField
              label="Achtergrondkleur"
              name="achtergrondKleur"
              defaultValue={branding.achtergrondKleur}
              helper="De paginaondergrond van je rekentool."
            />
          </div>

          <div
            className={cn(
              "flex flex-col gap-1.5",
              !magPersonaliserenUiterlijk && "pointer-events-none opacity-50"
            )}
          >
            <Label htmlFor="lettertype">Lettertype</Label>
            <Select id="lettertype" name="lettertype" defaultValue={branding.lettertype}>
              {lettertypeOpties.map((optie) => (
                <option key={optie.value} value={optie.value}>
                  {optie.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content & Copywriting</CardTitle>
          <CardDescription>De teksten die je klanten te zien krijgen.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customTitel">Custom titel (optioneel)</Label>
            <Input
              id="customTitel"
              name="customTitel"
              placeholder="Bereken uw project met {bedrijfsnaam}"
              defaultValue={branding.customTitel ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Gebruik <code className="text-foreground">{"{bedrijfsnaam}"}</code> om automatisch
              je bedrijfsnaam in te vullen. Leeg = standaardtitel.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="welkomstTekst">Welkomsttekst (optioneel)</Label>
            <Textarea
              id="welkomstTekst"
              name="welkomstTekst"
              placeholder="Fijn dat u een offerte overweegt! Stel hieronder uw project samen."
              defaultValue={branding.welkomstTekst ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bedankTekst">Bedankttekst na aanvraag</Label>
            <Textarea
              id="bedankTekst"
              name="bedankTekst"
              required
              defaultValue={branding.bedankTekst}
            />
            <p className="text-xs text-muted-foreground">
              Verschijnt zodra een klant op &ldquo;Offerte aanvragen&rdquo; klikt.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bedrijfsgegevens tonen</CardTitle>
          <CardDescription>Laat klanten direct zien hoe ze je kunnen bereiken.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch
              name="toonEmail"
              defaultChecked={branding.toonEmail}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                E-mailadres tonen
              </span>
              <span className="block text-sm text-muted-foreground">{email}</span>
            </span>
          </label>

          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <label className="flex items-start gap-3">
              <Switch
                name="toonTelefoonnummer"
                checked={toonTelefoonnummer}
                onChange={(e) => setToonTelefoonnummer(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm font-medium text-foreground">Telefoonnummer tonen</span>
            </label>
            {toonTelefoonnummer && (
              <Input
                name="telefoonnummer"
                placeholder="06 12345678"
                defaultValue={branding.telefoonnummer ?? ""}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPositie">Positie op de rekentool</Label>
            <Select id="contactPositie" name="contactPositie" defaultValue={branding.contactPositie}>
              <option value="BOVENAAN">Bovenaan</option>
              <option value="ONDERAAN">Onderaan</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Branding opslaan"}
        </Button>
      </div>
    </form>
  );
}

// Relative luminance per WCAG — used to warn when white text (the header
// and CTA button always use white) would be hard to read on a very light
// primary color. Not a hard block: it's the tenant's own choice, just a
// nudge in the right direction.
function contrastAgainstWhite(hex: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const rgb = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1 + 0.05) / (luminance + 0.05);
}

function ColorField({
  label,
  name,
  defaultValue,
  helper,
  warnLightAgainstWhite = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  helper: string;
  warnLightAgainstWhite?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const swatchValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  const contrast = warnLightAgainstWhite ? contrastAgainstWhite(value) : null;
  const laagContrast = contrast !== null && contrast < 2;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatchValue}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`${label} kiezen`}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={7}
          className="font-mono uppercase"
        />
      </div>
      <p className="text-xs text-muted-foreground">{helper}</p>
      {laagContrast && (
        <p className="text-xs text-warning">
          Deze kleur is vrij licht — de witte tekst in de header en knoppen kan lastig leesbaar
          worden. Kies een iets donkerder tint voor beter contrast.
        </p>
      )}
    </div>
  );
}
