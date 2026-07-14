"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, Mail, MessageCircle, Pencil, Trash2, Check, Plus } from "lucide-react";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import { cn } from "@/app/lib/cn";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/input";
import {
  addLeadNoteAction,
  updateLeadNoteAction,
  deleteLeadNoteAction,
  type LeadFormState,
} from "@/app/lib/actions/leads";
import { whatsappLink } from "@/app/lib/leads";
import { StatusSelect } from "./status-select";
import type { LeadWithNotes } from "./leads-view";
import type { LeadNote } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadDetailDrawer({
  lead,
  onClose,
}: {
  lead: LeadWithNotes | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!lead) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lead, onClose]);

  if (!lead) return null;

  const mailtoHref = `mailto:${lead.email}?subject=${encodeURIComponent("Over je offerte-aanvraag")}`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Aanvraag van ${lead.naam}`} className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
      />
      <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{lead.naam}</p>
            <p className="text-xs text-muted-foreground">{dateFormatter.format(lead.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="flex flex-col gap-3">
            <StatusSelect leadId={lead.id} status={lead.status} className="w-full" />

            <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              <span>{lead.email}</span>
              {lead.telefoonnummer && <span>{lead.telefoonnummer}</span>}
            </div>

            <div className="flex gap-2">
              <a href={mailtoHref} className="flex-1">
                <Button type="button" variant="secondary" className="w-full">
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
                  <Button type="button" variant="secondary" className="w-full">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Aanvraag</h3>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
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
            <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/40 p-3 text-sm">
              <TotalRow label="Arbeidskosten" value={lead.snapshot.arbeidskosten} />
              <TotalRow label="Materiaalkosten" value={lead.snapshot.materiaalkosten} />
              <TotalRow label="Transportkosten" value={lead.snapshot.transportkosten} />
              <TotalRow label="Voorrijkosten" value={lead.snapshot.voorrijkosten} />
              <div className="my-1 border-t border-border" />
              <TotalRow label="Subtotaal" value={lead.snapshot.subtotaal} />
              <TotalRow label="Btw" value={lead.snapshot.btw} />
              <div className="flex items-center justify-between pt-1 text-sm font-semibold text-foreground">
                <span>Totaal (incl. btw)</span>
                <span>{formatCurrency(lead.snapshot.totaal)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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
      </div>
    </div>,
    document.body
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
        <Textarea name="tekst" defaultValue={note.tekst} rows={2} required autoFocus />
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
        <form
          action={deleteLeadNoteAction}
          onSubmit={(e) => {
            if (!confirm("Weet je zeker dat je deze notitie wilt verwijderen?")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="noteId" value={note.id} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Verwijderen">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </form>
      </div>
    </div>
  );
}
