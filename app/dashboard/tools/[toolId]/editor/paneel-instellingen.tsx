"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { ProFeatureLock } from "@/app/components/dashboard/pro-feature-lock";
import { Badge } from "@/app/components/ui/badge";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Field } from "@/app/components/ui/field";
import { Input, Textarea } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { slaAanvraagPaneelOpAction, slaResultaatPaneelOpAction } from "@/app/lib/actions/rekentools";
import { bekijkOmzettingAction, zetOmNaarStandaardblokkenAction } from "@/app/lib/actions/omzetten";
import { formatCurrency } from "@/app/lib/format";
import type { RekentoolAnalyse } from "@/app/lib/rekentool-analyse";
import { PublicerenActions } from "../publiceren/publiceren-actions";
import { EmbedSettingsForm } from "../embed/embed-settings-form";
import { EmbedTutorialTabs } from "../embed/embed-tutorial-tabs";
import { BrandingForm } from "../uiterlijk/branding-form";
import { useAutosave, type AutosaveStatus } from "../producten/editor/use-autosave";
import type { Branding, SubscriptionTier, ToolStatus } from "@/app/generated/prisma/client";
import type { ToolEmbedConfig } from "@/app/lib/tools";

type StatusMelder = (s: { status: AutosaveStatus; fout: string | null; ongeldig: boolean; opnieuw: () => void }) => void;

function useStatusMelding(autosave: { status: AutosaveStatus; fout: string | null; opnieuw: () => void }, onStatus: StatusMelder) {
  const { status, fout, opnieuw } = autosave;
  useEffect(() => {
    onStatus({ status, fout, ongeldig: false, opnieuw });
  }, [status, fout, opnieuw, onStatus]);
}

function Kop({ titel, uitleg }: { titel: string; uitleg: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground">{titel}</h2>
      <p className="text-sm text-muted-foreground">{uitleg}</p>
    </div>
  );
}

function Regel({ label, aan, onChange }: { label: string; aan: boolean; onChange: (aan: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
      {label}
      <Switch checked={aan} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    </label>
  );
}

export type ResultaatStart = {
  arbeidZichtbaar: boolean;
  materiaalZichtbaar: boolean;
  transportZichtbaar: boolean;
  voorrijZichtbaar: boolean;
  toelichting: string;
  ctaTekst: string;
};

export function PaneelResultaat({ toolId, start, onStatus, onWijzig }: { toolId: string; start: ResultaatStart; onStatus: StatusMelder; onWijzig: (v: ResultaatStart) => void }) {
  const [v, setV] = useState(start);
  const autosave = useAutosave(v, async (w) => {
    const r = await slaResultaatPaneelOpAction(toolId, w);
    return r.ok ? { ok: true } : r;
  });
  useStatusMelding(autosave, onStatus);
  const eerste = useRef(true);
  useEffect(() => {
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    onWijzig(v);
  }, [v, onWijzig]);
  const zet = (patch: Partial<ResultaatStart>) => setV((x) => ({ ...x, ...patch }));
  return (
    <div className="flex flex-col gap-5">
      <Kop titel="Resultaat" uitleg="Wat je klant ziet nadat die zijn werk heeft ingevuld." />
      <fieldset className="flex flex-col divide-y divide-border rounded-lg border border-border px-3">
        <legend className="px-1 text-sm font-bold text-foreground">Regels in de prijs</legend>
        <Regel label="Materiaal tonen" aan={v.materiaalZichtbaar} onChange={(a) => zet({ materiaalZichtbaar: a })} />
        <Regel label="Arbeid tonen" aan={v.arbeidZichtbaar} onChange={(a) => zet({ arbeidZichtbaar: a })} />
        <Regel label="Voorrijkosten tonen" aan={v.voorrijZichtbaar} onChange={(a) => zet({ voorrijZichtbaar: a })} />
        <Regel label="Transport tonen" aan={v.transportZichtbaar} onChange={(a) => zet({ transportZichtbaar: a })} />
      </fieldset>
      <p className="-mt-2 text-sm text-muted-foreground">Verborgen regels tellen nog wel mee in het totaal.</p>
      <Field label="Tekst op de knop" htmlFor="res-cta" hint="Leeg laten voor “Offerte aanvragen”.">
        <Input id="res-cta" value={v.ctaTekst} maxLength={60} placeholder="Bijv. Vraag nu je offerte aan…" onChange={(e) => zet({ ctaTekst: e.target.value })} />
      </Field>
      <Field label="Toelichting onder de prijs" htmlFor="res-toel" hint="Bijvoorbeeld: dit is een indicatie, je ontvangt binnen 1 werkdag een offerte.">
        <Textarea id="res-toel" value={v.toelichting} maxLength={300} onChange={(e) => zet({ toelichting: e.target.value })} />
      </Field>
    </div>
  );
}

export type AanvraagStart = { vraagTelefoon: boolean; bedankTekst: string };

export function PaneelAanvraag({ toolId, start, onStatus, onWijzig }: { toolId: string; start: AanvraagStart; onStatus: StatusMelder; onWijzig: (v: AanvraagStart) => void }) {
  const [v, setV] = useState(start);
  const eerste = useRef(true);
  useEffect(() => {
    if (eerste.current) {
      eerste.current = false;
      return;
    }
    onWijzig(v);
  }, [v, onWijzig]);
  const autosave = useAutosave(v, async (w) => {
    const r = await slaAanvraagPaneelOpAction(toolId, w);
    return r.ok ? { ok: true } : r;
  });
  useStatusMelding(autosave, onStatus);
  return (
    <div className="flex flex-col gap-5">
      <Kop titel="Aanvraagformulier" uitleg="Wat je klant invult om een aanvraag te versturen." />
      <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">Naam en e-mailadres vraag je altijd.</p>
      <div className="rounded-lg border border-border px-3">
        <Regel label="Telefoonnummer vragen" aan={v.vraagTelefoon} onChange={(a) => setV((x) => ({ ...x, vraagTelefoon: a }))} />
      </div>
      <Field label="Bedankttekst" htmlFor="aanv-bedankt" hint="Dit ziet je klant na het versturen.">
        <Textarea id="aanv-bedankt" value={v.bedankTekst} maxLength={300} onChange={(e) => setV((x) => ({ ...x, bedankTekst: e.target.value }))} />
      </Field>
      <p className="text-sm text-muted-foreground">In de Testmodus verstuur je geen echte aanvraag, ook niet als je op “Versturen” drukt.</p>
    </div>
  );
}

export function PaneelUiterlijk({
  toolId,
  branding,
  tier,
  email,
}: {
  toolId: string;
  branding: Branding;
  tier: SubscriptionTier;
  email: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Kop titel="Uiterlijk" uitleg="Logo, kleuren en teksten bovenin je rekentool." />
      <BrandingForm toolId={toolId} branding={branding} subscriptionTier={tier} email={email} />
    </div>
  );
}

export function PaneelWebsite({
  toolId,
  toolNaam,
  status,
  toolUrl,
  embedCode,
  embedConfig,
  magEmbedden,
  magPubliceren,
  limiet,
}: {
  toolId: string;
  toolNaam: string;
  status: ToolStatus;
  toolUrl: string;
  embedCode: string | null;
  embedConfig: ToolEmbedConfig;
  magEmbedden: boolean;
  magPubliceren: boolean;
  limiet: number | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Kop titel="Zet op mijn website" uitleg={`Zo komt “${toolNaam}” op je eigen website.`} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status === "GEPUBLICEERD" ? "success" : "muted"}>{status === "GEPUBLICEERD" ? "Live" : status === "GEPAUZEERD" ? "Gepauzeerd" : "Concept"}</Badge>
        <span className="text-sm text-muted-foreground">
          {status === "GEPUBLICEERD" ? "Klanten kunnen je rekentool gebruiken." : "Klanten kunnen je rekentool nog niet gebruiken."}
        </span>
      </div>
      <PublicerenActions toolId={toolId} huidigeStatus={status} magPubliceren={magPubliceren} limiet={limiet} />
      {status === "GEPUBLICEERD" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-foreground">Link naar je rekentool</p>
          <p className="break-all text-sm text-muted-foreground">{toolUrl}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={toolUrl} label="Kopieer link" />
            <LinkButton href={toolUrl} target="_blank" variant="secondary">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Bekijken
            </LinkButton>
          </div>
        </div>
      )}
      <section aria-labelledby="embed-titel" className="flex flex-col gap-3">
        <h3 id="embed-titel" className="font-bold text-foreground">
          Op je website plaatsen
        </h3>
        {magEmbedden && embedCode ? (
          <>
            <EmbedTutorialTabs embedCode={embedCode} />
            <EmbedSettingsForm toolId={toolId} embedConfig={embedConfig} />
          </>
        ) : (
          <ProFeatureLock title="Alleen bij Pro" description="Plaats je rekentool op je eigen website. Upgrade naar Pro om de code en uitleg te ontgrendelen." />
        )}
      </section>
    </div>
  );
}

export function PaneelAangepast({ toolId, onOmgezet }: { toolId: string; onOmgezet: () => void }) {
  const [analyse, setAnalyse] = useState<RekentoolAnalyse | "laden">("laden");
  const [bevestig, setBevestig] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let weg = false;
    void bekijkOmzettingAction(toolId).then((a) => {
      if (!weg) setAnalyse(a);
    });
    return () => {
      weg = true;
    };
  }, [toolId]);

  async function omzetten() {
    setBezig(true);
    setFout(null);
    const r = await zetOmNaarStandaardblokkenAction(toolId);
    setBezig(false);
    if (r.ok) onOmgezet();
    else setFout(r.error);
  }

  const lijst = analyse !== "laden" && analyse.soort === "ANALYSE" ? analyse.onderdelen : [];
  const kanAlles = lijst.length > 0 && lijst.every((o) => o.classificatie.soort === "STANDAARD" || o.classificatie.kanOmzetten);

  return (
    <div className="flex flex-col gap-4">
      <Kop titel="Aangepast" uitleg="Deze rekentool is op maat gebouwd en rekent op zijn eigen manier. Hij blijft precies zo rekenen." />

      {analyse === "laden" && <p className="text-sm text-muted-foreground">Even kijken wat erin zit…</p>}
      {analyse !== "laden" && analyse.soort === "NIET_OMZETBAAR" && <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{analyse.reden}</p>}

      {lijst.map((o) => (
        <section key={o.onderdeelId} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 font-bold text-foreground">{o.naam}</h3>
            <Badge variant={o.classificatie.soort === "STANDAARD" ? "success" : "warning"}>
              {o.classificatie.soort === "STANDAARD" ? "Past in standaardblokken" : "Aangepast"}
            </Badge>
          </div>
          {o.classificatie.soort === "AANGEPAST" && (
            <>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {o.classificatie.samenvatting.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {o.classificatie.kanOmzetten ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-foreground">Zo verandert de prijs bij omzetten</p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm tabular-nums">
                    {o.classificatie.verschillen.map((v) => (
                      <li key={v.beschrijving} className="flex flex-wrap justify-between gap-x-3">
                        <span className="min-w-0 text-muted-foreground">{v.beschrijving}</span>
                        <span className="text-foreground">
                          {formatCurrency(v.oud)} → <strong>{formatCurrency(v.nieuw)}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Dit deel heeft een eigen opzet en kan niet worden omgezet.</p>
              )}
            </>
          )}
        </section>
      ))}

      {lijst.length > 0 && (
        <div className="flex flex-col gap-2">
          {fout && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {fout}
            </p>
          )}
          {!bevestig ? (
            <Button type="button" variant="outline" className="h-11 self-start" disabled={!kanAlles} onClick={() => setBevestig(true)}>
              Omzetten naar standaardblokken
            </Button>
          ) : (
            <div role="alertdialog" aria-labelledby="omzet-titel" className="rounded-lg border border-border p-3">
              <p id="omzet-titel" className="font-semibold text-foreground">
                Omzetten met de prijzen hierboven?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Je rekentool rekent daarna met onderdelen. Je leads blijven bewaard. Voorrijkosten en transport tellen vanaf dan per onderdeel mee.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" className="h-11" disabled={bezig} onClick={() => void omzetten()}>
                  {bezig ? "Omzetten…" : "Ja, omzetten"}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setBevestig(false)}>
                  Nee, laat zo
                </Button>
              </div>
            </div>
          )}
          {!kanAlles && <p className="text-sm text-muted-foreground">Omzetten kan pas als alle delen in de standaardblokken passen.</p>}
        </div>
      )}

      <LinkButton href={`/dashboard/tools/${toolId}/bouwer`} variant="ghost" className="h-11 self-start">
        Op maat bewerken
      </LinkButton>
    </div>
  );
}
