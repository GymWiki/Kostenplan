"use client";

import type { CalculatorResultSettings, ResultDisplayMode } from "@/app/lib/calculator-engine";
import { PRIJS_AFRONDING_LABELS, CTA_LABELS } from "@/app/lib/tools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DecimalInput, Input, Label, Select, Textarea } from "@/app/components/ui/input";
import type { ToolPrijsAfronding, ToolCtaType } from "@/app/generated/prisma/client";

const WEERGAVE_LABELS: Record<ResultDisplayMode, string> = {
  EXACT: "Exacte prijs",
  VANAF: "Vanafprijs",
  RANGE: "Prijsrange",
  UITGEBREID: "Uitgebreid (met kostenuitsplitsing)",
  GEEN: "Geen prijs tonen",
};

export function ResultaatTab({
  instellingen,
  onChange,
}: {
  instellingen: CalculatorResultSettings;
  onChange: (instellingen: CalculatorResultSettings) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Resultaat</h2>
        <p className="mt-1 text-sm text-muted-foreground">Hoe zie je klant de uitkomst van de berekening?</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prijsweergave</CardTitle>
          <CardDescription>Kies hoe specifiek de getoonde prijs is.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-weergave">Weergave</Label>
            <Select
              id="res-weergave"
              value={instellingen.weergave}
              onChange={(e) => onChange({ ...instellingen, weergave: e.target.value as ResultDisplayMode })}
            >
              {Object.entries(WEERGAVE_LABELS).map(([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-afronding">Afronding</Label>
            <Select
              id="res-afronding"
              value={instellingen.afronding}
              onChange={(e) => onChange({ ...instellingen, afronding: e.target.value as ToolPrijsAfronding })}
            >
              {Object.entries(PRIJS_AFRONDING_LABELS).map(([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {instellingen.weergave === "RANGE" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-marge-omlaag">Marge omlaag</Label>
                <div className="relative">
                  <DecimalInput
                    id="res-marge-omlaag"
                    value={instellingen.bandbreedteMargeOmlaag}
                    onChange={(e) => onChange({ ...instellingen, bandbreedteMargeOmlaag: Number(e.target.value) || 0 })}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="res-marge-omhoog">Marge omhoog</Label>
                <div className="relative">
                  <DecimalInput
                    id="res-marge-omhoog"
                    value={instellingen.bandbreedteMargeOmhoog}
                    onChange={(e) => onChange({ ...instellingen, bandbreedteMargeOmhoog: Number(e.target.value) || 0 })}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call-to-action</CardTitle>
          <CardDescription>De knop en toelichting die je klant na de berekening ziet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-cta-type">Actietype</Label>
            <Select
              id="res-cta-type"
              value={instellingen.ctaType}
              onChange={(e) => onChange({ ...instellingen, ctaType: e.target.value as ToolCtaType })}
            >
              {Object.entries(CTA_LABELS).map(([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-cta-tekst">Knoptekst (optioneel)</Label>
            <Input
              id="res-cta-tekst"
              value={instellingen.ctaTekst ?? ""}
              onChange={(e) => onChange({ ...instellingen, ctaTekst: e.target.value || null })}
              placeholder="Bijv. Vraag nu je offerte aan"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-toelichting">Toelichting (optioneel)</Label>
            <Textarea
              id="res-toelichting"
              value={instellingen.toelichting ?? ""}
              onChange={(e) => onChange({ ...instellingen, toelichting: e.target.value || null })}
              placeholder="Bijv. Dit is een indicatie. Je ontvangt binnen 1 werkdag een definitieve offerte."
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
