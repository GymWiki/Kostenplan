"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Mail,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DecimalInput, Input, Label, Textarea } from "@/app/components/ui/input";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { OfferteStatusBadge } from "../../offerte-status-badge";
import { OffertePreview } from "./offerte-preview";
import {
  saveOfferteAction,
  genereerDeelLinkAction,
  regenereerDeelLinkAction,
  type OfferteFormState,
} from "@/app/lib/actions/offertes";
import { berekenOfferteTotalen, regelTotaal, type OfferteRegel } from "@/app/lib/offertes";
import { formatCurrency } from "@/app/lib/format";
import type { Branding, Offerte } from "@/app/generated/prisma/client";

type EditRegel = { id: string; omschrijving: string; aantal: string; eenheid: string; prijsPerEenheid: string };

function naarEditRegel(regel: OfferteRegel): EditRegel {
  return {
    id: regel.id,
    omschrijving: regel.omschrijving,
    aantal: String(regel.aantal),
    eenheid: regel.eenheid,
    prijsPerEenheid: String(regel.prijsPerEenheid),
  };
}

function parseDecimal(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function naarOfferteRegel(regel: EditRegel): OfferteRegel {
  return {
    id: regel.id,
    omschrijving: regel.omschrijving,
    aantal: parseDecimal(regel.aantal),
    eenheid: regel.eenheid,
    prijsPerEenheid: parseDecimal(regel.prijsPerEenheid),
  };
}

function naarDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function OfferteEditor({
  offerte,
  klantNaam,
  bedrijfsnaam,
  branding,
  btwPercentage,
  siteUrl,
}: {
  offerte: Offerte & { regels: OfferteRegel[] };
  klantNaam: string;
  bedrijfsnaam: string;
  branding: Branding | null;
  btwPercentage: number;
  siteUrl: string;
}) {
  const [regels, setRegels] = useState<EditRegel[]>(offerte.regels.map(naarEditRegel));
  const [introTekst, setIntroTekst] = useState(offerte.introTekst ?? "");
  const [voorwaardenTekst, setVoorwaardenTekst] = useState(offerte.voorwaardenTekst ?? "");
  const [geldigTot, setGeldigTot] = useState(naarDateInputValue(offerte.geldigTot));

  const [saveState, saveAction, savePending] = useActionState<OfferteFormState, FormData>(
    saveOfferteAction.bind(null, offerte.id),
    null
  );
  const [shareState, shareAction, sharePending] = useActionState<OfferteFormState, FormData>(
    genereerDeelLinkAction.bind(null, offerte.id),
    null
  );

  const parsedRegels = useMemo(() => regels.map(naarOfferteRegel), [regels]);
  const regelsJson = useMemo(() => JSON.stringify(parsedRegels), [parsedRegels]);
  const totalen = berekenOfferteTotalen(parsedRegels, btwPercentage);

  function addRegel() {
    setRegels((r) => [
      ...r,
      { id: crypto.randomUUID(), omschrijving: "", aantal: "1", eenheid: "stuk", prijsPerEenheid: "0" },
    ]);
  }
  function removeRegel(id: string) {
    setRegels((r) => r.filter((regel) => regel.id !== id));
  }
  function updateRegel(id: string, patch: Partial<EditRegel>) {
    setRegels((r) => r.map((regel) => (regel.id === id ? { ...regel, ...patch } : regel)));
  }
  function moveRegel(id: string, richting: -1 | 1) {
    setRegels((r) => {
      const i = r.findIndex((regel) => regel.id === id);
      const j = i + richting;
      if (i === -1 || j < 0 || j >= r.length) return r;
      const kopie = [...r];
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
      return kopie;
    });
  }

  const deelUrl = offerte.deelToken ? `${siteUrl}/offerte/${offerte.deelToken}` : null;
  const pending = savePending || sharePending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/leads"
            className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug naar aanvragen
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            Offerte voor {klantNaam}
            <OfferteStatusBadge offerte={offerte} />
          </h1>
        </div>
      </div>

      {deelUrl && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Delen met de klant</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={deelUrl} label="Kopieer link" />
              {offerte.pdfUrl ? (
                <LinkButton href={offerte.pdfUrl} target="_blank" variant="secondary">
                  <Download className="h-4 w-4" />
                  Download PDF
                </LinkButton>
              ) : (
                <Button type="button" variant="secondary" disabled>
                  <Download className="h-4 w-4" />
                  PDF niet beschikbaar
                </Button>
              )}
              <LinkButton
                href={`mailto:?subject=${encodeURIComponent(`Offerte van ${bedrijfsnaam}`)}&body=${encodeURIComponent(
                  `Hoi ${klantNaam},\n\nHierbij de offerte: ${deelUrl}\n\nMet vriendelijke groet,\n${bedrijfsnaam}`
                )}`}
                variant="secondary"
              >
                <Mail className="h-4 w-4" />
                Open in e-mail
              </LinkButton>
              <form action={regenereerDeelLinkAction.bind(null, offerte.id)}>
                <Button type="submit" variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  Nieuwe link genereren
                </Button>
              </form>
            </div>
            <p className="truncate text-xs text-muted-foreground">{deelUrl}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="flex flex-col gap-4">
          <input type="hidden" name="regels" value={regelsJson} />
          <input type="hidden" name="introTekst" value={introTekst} />
          <input type="hidden" name="voorwaardenTekst" value={voorwaardenTekst} />
          <input type="hidden" name="geldigTot" value={geldigTot} />

          <Card>
            <CardHeader>
              <CardTitle>Regels</CardTitle>
              <CardDescription>
                Vooraf gevuld vanuit de aanvraag — volledig aan te passen vóórdat je iets deelt.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {regels.map((regel, i) => (
                <div key={regel.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={regel.omschrijving}
                      onChange={(e) => updateRegel(regel.id, { omschrijving: e.target.value })}
                      placeholder="Omschrijving"
                      className="flex-1"
                    />
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => moveRegel(regel.id, -1)}
                        disabled={i === 0}
                        aria-label="Omhoog verplaatsen"
                        className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRegel(regel.id, 1)}
                        disabled={i === regels.length - 1}
                        aria-label="Omlaag verplaatsen"
                        className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRegel(regel.id)}
                      aria-label="Regel verwijderen"
                      className="shrink-0 cursor-pointer rounded p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Aantal</Label>
                      <DecimalInput
                        value={regel.aantal}
                        onChange={(e) => updateRegel(regel.id, { aantal: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Eenheid</Label>
                      <Input
                        value={regel.eenheid}
                        onChange={(e) => updateRegel(regel.id, { eenheid: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Prijs p/eenheid</Label>
                      <DecimalInput
                        value={regel.prijsPerEenheid}
                        onChange={(e) => updateRegel(regel.id, { prijsPerEenheid: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    Totaal: {formatCurrency(regelTotaal(naarOfferteRegel(regel)))}
                  </p>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addRegel} className="self-start">
                <Plus className="h-4 w-4" />
                Regel toevoegen
              </Button>

              <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotaal</span>
                  <span>{formatCurrency(totalen.subtotaal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Btw ({btwPercentage}%)</span>
                  <span>{formatCurrency(totalen.btw)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Totaal</span>
                  <span>{formatCurrency(totalen.totaal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teksten &amp; geldigheid</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="introTekstVeld">Introtekst</Label>
                <Textarea
                  id="introTekstVeld"
                  value={introTekst}
                  onChange={(e) => setIntroTekst(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="voorwaardenTekstVeld">Voorwaarden</Label>
                <Textarea
                  id="voorwaardenTekstVeld"
                  value={voorwaardenTekst}
                  onChange={(e) => setVoorwaardenTekst(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="geldigTotVeld">Geldig tot</Label>
                <Input
                  id="geldigTotVeld"
                  type="date"
                  value={geldigTot}
                  onChange={(e) => setGeldigTot(e.target.value)}
                  className="max-w-48"
                />
              </div>
            </CardContent>
          </Card>

          {(saveState?.error || shareState?.error) && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveState?.error || shareState?.error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" formAction={shareAction} disabled={pending} className="flex-1">
              {sharePending ? "Bezig…" : "Genereer offerte om te delen"}
            </Button>
            <Button type="submit" formAction={saveAction} variant="outline" disabled={pending} className="flex-1">
              {savePending ? "Bezig…" : "Concept opslaan"}
            </Button>
          </div>
        </form>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <OffertePreview
            bedrijfsnaam={bedrijfsnaam}
            klantNaam={klantNaam}
            branding={branding}
            regels={parsedRegels}
            introTekst={introTekst}
            voorwaardenTekst={voorwaardenTekst}
            geldigTot={geldigTot ? new Date(geldigTot) : null}
            btwPercentage={btwPercentage}
          />
        </div>
      </div>
    </div>
  );
}
