"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  TriangleAlert,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { DecimalInput, Input, Label, Textarea } from "@/app/components/ui/input";
import { CopyButton } from "@/app/components/dashboard/copy-link";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { OfferteStatusBadge } from "../../offerte-status-badge";
import { OffertePreview } from "./offerte-preview";
import { VerzendBevestigingModal } from "./verzend-bevestiging-modal";
import {
  saveOfferteAction,
  genereerDeelLinkAction,
  regenereerDeelLinkAction,
  herberekenOfferteAction,
  intrekOfferteAction,
  deleteOfferteAction,
  type OfferteFormState,
} from "@/app/lib/actions/offertes";
import { berekenOfferteTotalen, heeftVerouderdeBerekening, regelTotaal, type OfferteRegel } from "@/app/lib/offertes";
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
  klantEmail,
  bedrijfsnaam,
  branding,
  btwPercentage,
  siteUrl,
}: {
  offerte: Offerte & { regels: OfferteRegel[] };
  klantNaam: string;
  klantEmail: string;
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
  const [regenPending, startRegenTransition] = useTransition();
  function regenereerDeelLink() {
    startRegenTransition(() => regenereerDeelLinkAction(offerte.id));
  }

  const formRef = useRef<HTMLFormElement>(null);
  const [verzendModalOpen, setVerzendModalOpen] = useState(false);
  function bevestigVersturen() {
    if (!formRef.current) return;
    shareAction(new FormData(formRef.current));
    setVerzendModalOpen(false);
  }

  const [intrekOpen, setIntrekOpen] = useState(false);
  const [intrekPending, startIntrekTransition] = useTransition();
  function bevestigIntrekken() {
    startIntrekTransition(async () => {
      await intrekOfferteAction(offerte.id);
      setIntrekOpen(false);
    });
  }

  const parsedRegels = useMemo(() => regels.map(naarOfferteRegel), [regels]);
  const regelsJson = useMemo(() => JSON.stringify(parsedRegels), [parsedRegels]);
  const totalen = berekenOfferteTotalen(parsedRegels, btwPercentage);

  // Alleen relevant voor een nog niet verzonden concept — een al gedeelde of
  // definitieve offerte wordt hier nooit met terugwerkende kracht op
  // gecontroleerd of aangepast.
  const verouderd = offerte.status === "CONCEPT" && heeftVerouderdeBerekening(parsedRegels);
  const [herberekenPending, startHerberekenTransition] = useTransition();
  function herbereken() {
    startHerberekenTransition(async () => {
      const nieuweRegels = await herberekenOfferteAction(offerte.id);
      if (nieuweRegels) setRegels(nieuweRegels.map(naarEditRegel));
    });
  }

  function addRegel() {
    setRegels((r) => [
      ...r,
      { id: crypto.randomUUID(), omschrijving: "", aantal: "1", eenheid: "stuk", prijsPerEenheid: "0" },
    ]);
  }
  function removeRegel(id: string) {
    setRegels((r) => r.filter((regel) => regel.id !== id));
  }
  const [pendingVerwijderId, setPendingVerwijderId] = useState<string | null>(null);
  function handleVerwijderKlik(regel: EditRegel) {
    // Net als bij de regelgroepen in producten/velden/veld-form.tsx: een
    // net toegevoegde, nog lege regel mag zonder omweg weg — pas met echte
    // inhoud (en dus echt risico op dataverlies) volgt een bevestiging.
    const heeftInhoud = regel.omschrijving.trim() !== "" || parseDecimal(regel.prijsPerEenheid) !== 0;
    if (heeftInhoud) setPendingVerwijderId(regel.id);
    else removeRegel(regel.id);
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

  // Dit formulier autosaved niet (in tegenstelling tot product-form.tsx) —
  // wegnavigeren of de tab sluiten met onopgeslagen regel-/tekstwijzigingen
  // gooit ze anders stilzwijgend weg. `savedSnapshot` volgt de laatst
  // opgeslagen staat (initieel = de offerte zoals meegegeven, daarna elke
  // keer bijgewerkt zodra saveState?.success wisselt).
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    regelsJson: JSON.stringify(offerte.regels.map(naarEditRegel).map(naarOfferteRegel)),
    introTekst: offerte.introTekst ?? "",
    voorwaardenTekst: offerte.voorwaardenTekst ?? "",
    geldigTot: naarDateInputValue(offerte.geldigTot),
  }));
  // Bijwerken tijdens render i.p.v. in een effect ("afgeleide state van een
  // vorige render" — het React-aanbevolen patroon hiervoor, zie
  // react.dev/learn/you-might-not-need-an-effect): voorkomt een extra
  // effect-cascade en werkt de snapshot al bij vóórdat deze render klaar is.
  const [laatsteSaveState, setLaatsteSaveState] = useState(saveState);
  if (saveState !== laatsteSaveState) {
    setLaatsteSaveState(saveState);
    if (saveState?.success) setSavedSnapshot({ regelsJson, introTekst, voorwaardenTekst, geldigTot });
  }
  const isDirty =
    regelsJson !== savedSnapshot.regelsJson ||
    introTekst !== savedSnapshot.introTekst ||
    voorwaardenTekst !== savedSnapshot.voorwaardenTekst ||
    geldigTot !== savedSnapshot.geldigTot;

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const router = useRouter();
  const [verlaatBevestigenOpen, setVerlaatBevestigenOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/leads"
            onClick={(e) => {
              if (isDirty) {
                e.preventDefault();
                setVerlaatBevestigenOpen(true);
              }
            }}
            className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Terug naar aanvragen
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            Offerte voor {klantNaam}
            <OfferteStatusBadge offerte={offerte} />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {offerte.status === "VERSTUURD" && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setIntrekOpen(true)}>
                <Undo2 className="h-4 w-4" />
                Intrekken
              </Button>
              <ConfirmDialog
                open={intrekOpen}
                onClose={() => setIntrekOpen(false)}
                onConfirm={bevestigIntrekken}
                pending={intrekPending}
                variant="primary"
                title="Offerte intrekken?"
                description="De klant ziet voortaan een melding dat de offerte niet meer beschikbaar is; de link blijft bestaan. Je kunt de offerte later opnieuw versturen."
                confirmLabel="Intrekken"
              />
            </>
          )}
          {offerte.status === "CONCEPT" && (
            <DeleteButton
              action={deleteOfferteAction}
              id={offerte.id}
              idField="offerteId"
              confirmTitle="Concept verwijderen?"
              confirmMessage="Dit concept is nooit verzonden en wordt definitief verwijderd. Dit kan niet ongedaan worden gemaakt."
            />
          )}
        </div>
      </div>

      {offerte.status === "GEACCEPTEERD" && (
        <Card className="border-accent bg-accent/50">
          <CardContent className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
            <p className="text-sm text-accent-foreground">
              Deze offerte is geaccepteerd door de klant en kan niet meer worden gewijzigd.
            </p>
          </CardContent>
        </Card>
      )}

      {verouderd && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Deze offerte is berekend met verouderde prijzen
                </p>
                <p className="text-sm text-muted-foreground">
                  De aanvraag waarop dit concept is gebaseerd gaf geen prijs per productregel mee,
                  waardoor alle kosten in één post staan. Bereken de regels opnieuw met de huidige
                  logica.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={herbereken} disabled={herberekenPending}>
              <RefreshCw className="h-4 w-4" />
              {herberekenPending ? "Bezig…" : "Opnieuw berekenen"}
            </Button>
          </CardContent>
        </Card>
      )}

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
              <Button type="button" variant="ghost" size="sm" onClick={regenereerDeelLink} disabled={regenPending}>
                <RefreshCw className="h-4 w-4" />
                {regenPending ? "Bezig…" : "Nieuwe link genereren"}
              </Button>
            </div>
            <p className="truncate text-xs text-muted-foreground">{deelUrl}</p>
          </CardContent>
        </Card>
      )}

      {offerte.status === "GEACCEPTEERD" ? (
        <div className="max-w-xl">
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
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <form ref={formRef} className="flex flex-col gap-4">
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
                      onClick={() => handleVerwijderKlik(regel)}
                      aria-label="Regel verwijderen"
                      className="shrink-0 cursor-pointer rounded p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
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

              <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm tabular-nums">
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
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
              {saveState?.error || shareState?.error}
            </p>
          )}
          {saveState?.success && (
            <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground" aria-live="polite">
              Concept opgeslagen.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              size="lg"
              disabled={pending}
              className="w-full sm:flex-1"
              onClick={() => setVerzendModalOpen(true)}
            >
              {sharePending ? "Bezig…" : "Genereer offerte om te delen"}
            </Button>
            <Button type="submit" formAction={saveAction} variant="outline" size="lg" disabled={pending} className="w-full sm:flex-1">
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
      )}

      <VerzendBevestigingModal
        open={verzendModalOpen}
        onClose={() => setVerzendModalOpen(false)}
        onBevestig={bevestigVersturen}
        pending={sharePending}
        klantNaam={klantNaam}
        klantEmail={klantEmail}
        regels={parsedRegels}
        totaal={totalen.totaal}
        geldigTot={geldigTot ? new Date(geldigTot) : null}
      />

      <ConfirmDialog
        open={pendingVerwijderId != null}
        onClose={() => setPendingVerwijderId(null)}
        onConfirm={() => {
          if (pendingVerwijderId) removeRegel(pendingVerwijderId);
          setPendingVerwijderId(null);
        }}
        title="Regel verwijderen?"
        description="De ingevulde omschrijving en prijs voor deze regel gaan verloren."
      />
      <ConfirmDialog
        open={verlaatBevestigenOpen}
        onClose={() => setVerlaatBevestigenOpen(false)}
        onConfirm={() => router.push("/dashboard/leads")}
        title="Pagina verlaten?"
        description="Niet-opgeslagen wijzigingen aan deze offerte gaan verloren."
      />
    </div>
  );
}
