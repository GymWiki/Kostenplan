"use client";

import Link from "next/link";
import { kostenRijen } from "@/app/lib/lead-kosten";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X, Mail, MessageCircle, Pencil, Check, Plus, FileText } from "lucide-react";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import { cn } from "@/app/lib/cn";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { Textarea } from "@/app/components/ui/input";
import {
  addLeadNoteAction,
  updateLeadNoteAction,
  deleteLeadNoteAction,
  type LeadFormState,
} from "@/app/lib/actions/leads";
import { omzettenNaarOfferteAction, markOffertReactieGezienAction } from "@/app/lib/actions/offertes";
import { markeerOfferteV2GezienAction } from "@/app/lib/actions/offerte-v2";
import { whatsappLink } from "@/app/lib/leads";
import dynamic from "next/dynamic";
import { adresRegel } from "@/app/lib/werkgebied/adres-invoer";
import { afstandTekst } from "@/app/lib/werkgebied/lead-markeringen";
import { LeadVoortgangBlok } from "./lead-voortgang-blok";
import { LocatieLabels } from "./locatie-labels";
import { StatusSelect } from "./status-select";
import { OfferteStatusBadge } from "./offerte-status-badge";
import { AfhandelKeuzeModal } from "./afhandel-keuze-modal";
import type { LeadWithNotes } from "./leads-view";
import type { LeadNote, LeadStatus } from "@/app/generated/prisma/client";
import { datumLangMetTijd } from "@/app/lib/datum";

const dateFormatter = { format: datumLangMetTijd };

export type LeadStart = { lat: number; lon: number; straalKm: number | null; label: string };

const WerkgebiedKaart = dynamic(() => import("@/app/components/werkgebied/kaart").then((m) => m.WerkgebiedKaart), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-lg bg-secondary" aria-hidden="true" />,
});

// Adres, afstand en kaart van de klant (alleen bij een rekentool met werkgebied).
function LocatieBlok({ snapshot, start }: { snapshot: LeadWithNotes["snapshot"]; start: LeadStart | null }) {
  const loc = snapshot.locatie;
  if (!loc) return null;
  const afstand = afstandTekst(snapshot);
  const adres = loc.gecontroleerd ? adresRegel(loc) : `${loc.postcode.replace(/^(\d{4})([A-Za-z]{2})$/, "$1 $2")} ${loc.huisnummer}${loc.toevoeging}`;
  const heeftPunt = loc.lat !== null && loc.lon !== null;
  return (
    <div className="flex flex-col gap-2 max-md:order-1">
      <h3 className="text-sm font-semibold text-foreground">Locatie</h3>
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3 text-sm">
        <p className="font-medium text-foreground">{adres}</p>
        {afstand && <p className="text-muted-foreground">{afstand} hemelsbreed vanaf je startadres</p>}
        <LocatieLabels snapshot={snapshot} metAfstand={false} />
        {!loc.gecontroleerd && <p className="text-xs text-muted-foreground">De adressendienst was niet bereikbaar, dus dit adres en de afstand zijn niet gecontroleerd.</p>}
      </div>
      {heeftPunt && (
        <WerkgebiedKaart
          start={start ? { lat: start.lat, lon: start.lon, label: start.label } : null}
          straalKm={start?.straalKm ?? null}
          klant={{ lat: loc.lat as number, lon: loc.lon as number, label: afstand ? `Klant · ${afstand}` : "Klant" }}
          hoogte={220}
          ariaLabel="Kaart met de locatie van de klant"
        />
      )}
    </div>
  );
}

export function LeadDetailDrawer({
  lead,
  onClose,
  onUpdateStatus,
  toolBestaat,
  start = null,
}: {
  start?: LeadStart | null;
  lead: LeadWithNotes | null;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  // De rekentool van deze lead bestaat nog (niet verwijderd).
  toolBestaat: boolean;
}) {
  // De vakman "ziet" een klantreactie door de aanvraag te openen — dooft de
  // pulserende stip op de kanban-kaart/lijstregel (zie kanban-board.tsx).
  useEffect(() => {
    if (lead?.offerte && !lead.offerte.reactieGezien) {
      if (lead.offerte.v2Status) void markeerOfferteV2GezienAction(lead.offerte.id);
      else markOffertReactieGezienAction(lead.offerte.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const [omzettenPending, startOmzettenTransition] = useTransition();
  const [keuzeModal, setKeuzeModal] = useState<{ open: boolean; startStap: "keuze" | "notitie"; waarschuwing?: string }>({
    open: false,
    startStap: "keuze",
  });

  if (!lead) return null;

  // "Bekijk in rekentool": opent de editor met de werkzaamheid van deze lead.
  const eerstProductId = lead.snapshot.regels.find((r) => r.productId)?.productId;
  const rekentoolHref = `/dashboard/tools/${lead.toolId}${eerstProductId ? `?paneel=${encodeURIComponent(`werkzaamheid:${eerstProductId}`)}` : ""}`;

  const mailtoHref = `mailto:${lead.email}?subject=${encodeURIComponent("Over je offerte-aanvraag")}`;

  return (
    <Overlay open onClose={onClose} ariaLabel={`Aanvraag van ${lead.naam}`}>
      <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain border-l border-border bg-card shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{lead.naam}</p>
            <p className="text-xs text-muted-foreground">
              {lead.toolNaamSnapshot} · {dateFormatter.format(lead.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground max-md:flex max-md:h-11 max-md:w-11 max-md:items-center max-md:justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5 max-md:pb-6">
          <div className="order-first">
            <LeadVoortgangBlok leadId={lead.id} naam={lead.naam} voortgang={lead.voortgang} />
          </div>
          <div className="flex flex-col gap-3 max-md:order-2">
            <StatusSelect leadId={lead.id} status={lead.status} className="w-full" onStatusChange={onUpdateStatus} />

            <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              <span>{lead.email}</span>
              {lead.telefoonnummer && <span>{lead.telefoonnummer}</span>}
            </div>

            <div className="flex gap-2">
              <a href={mailtoHref} className="flex-1">
                <Button type="button" variant="secondary" className="w-full max-md:h-12">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Button>
              </a>
              {lead.telefoonnummer && (
                <a
                  href={whatsappLink(lead.telefoonnummer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button type="button" variant="secondary" className="w-full max-md:h-12">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-md:order-3">
            <h3 className="text-sm font-semibold text-foreground">Offerte</h3>
            {lead.status === "EXTERN_AFGEHANDELD" ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-sm font-medium text-foreground">Extern afgehandeld</p>
                {lead.externAfgehandeldOp && (
                  <p className="text-xs text-muted-foreground">
                    Op {dateFormatter.format(lead.externAfgehandeldOp)}
                  </p>
                )}
                {lead.externAfgehandeldNotitie && (
                  <p className="text-xs italic text-muted-foreground">“{lead.externAfgehandeldNotitie}”</p>
                )}
                {lead.offerte && (
                  <LinkButton href={`/dashboard/leads/${lead.id}/offerte`} variant="secondary" className="w-full max-md:h-12">
                    <FileText className="h-4 w-4" />
                    Offerte bekijken/bewerken
                    <OfferteStatusBadge offerte={lead.offerte} />
                  </LinkButton>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={omzettenPending}
                  onClick={() => startOmzettenTransition(() => omzettenNaarOfferteAction(lead.id))}
                >
                  {omzettenPending ? "Bezig…" : "Toch in Kostenplan afhandelen"}
                </Button>
              </div>
            ) : lead.offerte ? (
              <div className="flex flex-col gap-1.5">
                <LinkButton href={`/dashboard/leads/${lead.id}/offerte`} variant="secondary" className="w-full max-md:h-12">
                  <FileText className="h-4 w-4" />
                  Offerte bekijken/bewerken
                  <OfferteStatusBadge offerte={lead.offerte} />
                </LinkButton>
                <button
                  type="button"
                  onClick={() =>
                    setKeuzeModal({
                      open: true,
                      startStap: "notitie",
                      waarschuwing:
                        lead.offerte!.status !== "CONCEPT"
                          ? "Er is al een offerte verzonden of geaccepteerd bij deze lead."
                          : undefined,
                    })
                  }
                  className="cursor-pointer self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Ik verstuur deze offerte toch zelf
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="w-full max-md:h-12"
                onClick={() => setKeuzeModal({ open: true, startStap: "keuze" })}
              >
                <FileText className="h-4 w-4" />
                Aanvraag afhandelen
              </Button>
            )}
            <AfhandelKeuzeModal
              open={keuzeModal.open}
              onClose={() => setKeuzeModal((k) => ({ ...k, open: false }))}
              leadId={lead.id}
              startStap={keuzeModal.startStap}
              waarschuwing={keuzeModal.waarschuwing}
            />
          </div>

          <LocatieBlok snapshot={lead.snapshot} start={start} />

          <div className="flex flex-col gap-2 max-md:order-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Wat de klant koos</h3>
              {toolBestaat && (
                <Link
                  href={rekentoolHref}
                  className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Bekijk in rekentool
                </Link>
              )}
            </div>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border tabular-nums">
              {lead.snapshot.regels.map((regel, i) => {
                const details = [
                  regel.type === "product" && regel.aantal != null
                    ? `${regel.aantal} ${regel.eenheid ? unitLabel(regel.eenheid) : ""}`.trim()
                    : null,
                  regel.materiaal,
                  regel.extras && regel.extras.length > 0 ? regel.extras.join(", ") : null,
                ].filter(Boolean);

                return (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{regel.naam}</p>
                      {details.length > 0 && (
                        <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
                      )}
                    </div>
                    {regel.prijs != null && (
                      <span className="shrink-0 font-medium text-foreground">
                        {formatCurrency(regel.prijs)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/40 p-3 text-sm tabular-nums">
              {kostenRijen(lead.snapshot).map((r) => (
                <TotalRow key={r.label} label={r.label} value={r.waarde} />
              ))}
              <div className="my-1 border-t border-border" />
              <TotalRow label="Subtotaal" value={lead.snapshot.subtotaal} />
              <TotalRow label="Btw" value={lead.snapshot.btw} />
              <div className="flex items-center justify-between pt-1 text-sm font-semibold text-foreground">
                <span>Totaal (incl. btw)</span>
                <span>{formatCurrency(lead.snapshot.totaal)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-md:order-4">
            <h3 className="text-sm font-semibold text-foreground">Interne notities</h3>
            <NewNoteForm leadId={lead.id} />
            {lead.notities.length > 0 && (
              <div className="flex flex-col gap-2">
                {lead.notities.map((note) => (
                  <NoteRow key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobiel: de drie acties onder de duim. */}
        <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          {lead.telefoonnummer ? (
            <LinkButton href={`tel:${lead.telefoonnummer.replace(/[^0-9+]/g, "")}`} size="lg" className="flex-1 px-3">
              Bellen
            </LinkButton>
          ) : (
            <LinkButton href={mailtoHref} size="lg" className="flex-1 px-3">
              Mailen
            </LinkButton>
          )}
          {lead.telefoonnummer && (
            <LinkButton href={whatsappLink(lead.telefoonnummer)} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg" className="flex-1 px-3">
              WhatsApp
            </LinkButton>
          )}
          {lead.offerte ? (
            <LinkButton href={`/dashboard/leads/${lead.id}/offerte`} variant="secondary" size="lg" className="flex-1 px-3">
              Offerte
            </LinkButton>
          ) : (
            <Button type="button" variant="secondary" size="lg" className="flex-1 px-3" onClick={() => setKeuzeModal({ open: true, startStap: "keuze" })}>
              Offerte maken
            </Button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{formatCurrency(value)}</span>
    </div>
  );
}

function NewNoteForm({ leadId }: { leadId: string }) {
  const action = addLeadNoteAction.bind(null, leadId);
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <Textarea name="tekst" placeholder="Voeg een aantekening toe…" rows={2} required />
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <Plus className="h-4 w-4" />
          Toevoegen
        </Button>
      </div>
    </form>
  );
}

function NoteRow({ note }: { note: LeadNote }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        action={(formData) => {
          startTransition(async () => {
            const result = await updateLeadNoteAction(note.id, null, formData);
            if (result?.error) {
              setError(result.error);
            } else {
              setEditing(false);
            }
          });
        }}
        className="flex flex-col gap-2 rounded-lg border border-border p-3"
      >
        <Textarea name="tekst" aria-label="Notitie" defaultValue={note.tekst} rows={2} required autoFocus />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            <X className="h-4 w-4" />
            Annuleren
          </Button>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            <Check className="h-4 w-4" />
            Opslaan
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="whitespace-pre-wrap text-sm text-foreground">{note.tekst}</p>
        <p className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(note.updatedAt)}</p>
      </div>
      <div className={cn("flex shrink-0 gap-1")}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Bewerken"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <DeleteButton
          action={deleteLeadNoteAction}
          id={note.id}
          idField="noteId"
          confirmMessage="Weet je zeker dat je deze notitie wilt verwijderen?"
        />
      </div>
    </div>
  );
}
