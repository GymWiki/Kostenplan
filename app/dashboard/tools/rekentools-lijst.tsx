"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Package, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { DropdownMenu } from "@/app/components/ui/dropdown-menu";
import { Input } from "@/app/components/ui/input";
import { Overlay } from "@/app/components/ui/overlay";
import { ChevronRight } from "lucide-react";
import { StickyActiebalk } from "@/app/components/mobile/sticky-actiebalk";
import { UpgradeModal } from "@/app/components/dashboard/upgrade-modal";
import { duplicateToolAction } from "@/app/lib/actions/tools";
import {
  herstelRekentoolAction,
  hernoemRekentoolAction,
  maakRekentoolAction,
  verwijderRekentoolAction,
} from "@/app/lib/actions/rekentools";

export type RekentoolKaartData = {
  id: string;
  naam: string;
  live: boolean;
  aantalWerkzaamheden: number;
  leadsDezeMaand: number;
  nieuweLeads: number;
  toolUrl: string;
};

// Kaarten van het Rekentools-overzicht: naam, aantal werkzaamheden, status,
// leads deze maand en "Openen". Naam wijzigen, dupliceren en verwijderen
// (met bevestiging in de pagina en "Ongedaan maken") zitten in het menu.
export function RekentoolsLijst({
  tools,
  magNieuweTool,
  limiet,
  verwijderd,
}: {
  tools: RekentoolKaartData[];
  magNieuweTool: boolean;
  limiet: number | null;
  verwijderd: { id: string; naam: string } | null;
}) {
  const router = useRouter();
  const [melding, setMelding] = useState<{ id: string; naam: string } | null>(verwijderd);
  const [fout, setFout] = useState<string | null>(null);
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function herstel() {
    if (!melding) return;
    const r = await herstelRekentoolAction(melding.id);
    if (r.ok) {
      setMelding(null);
      router.replace("/dashboard/tools");
      router.refresh();
    } else setFout(r.error);
  }

  const nieuwKnop = (
    <Button
      type="button"
      onClick={() => (magNieuweTool ? setNieuwOpen(true) : setUpgradeOpen(true))}
      className="h-11"
    >
      <Plus className="h-4 w-4" aria-hidden="true" /> Nieuwe rekentool
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Rekentools</h1>
          <p className="mt-1 text-muted-foreground">Elke rekentool heeft zijn eigen onderdelen, uiterlijk en link.</p>
        </div>
        {nieuwKnop}
      </div>

      {melding && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
          <span className="min-w-0 flex-1">“{melding.naam}” is verwijderd.</span>
          <Button type="button" variant="outline" className="h-11" onClick={() => void herstel()}>
            <Undo2 className="h-4 w-4" aria-hidden="true" /> Ongedaan maken
          </Button>
        </div>
      )}
      {fout && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fout}
        </p>
      )}

      {/* Mobiel: één kaart per rekentool, tik opent; nieuwe rekentool onderin. */}
      <div className="flex flex-col gap-3 pb-24 md:hidden">
        {tools.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-base text-foreground">
            Je hebt nog geen rekentool. Maak er een en zet hem op je website.
          </p>
        ) : (
          tools.map((t) => <KaartMobiel key={t.id} tool={t} />)
        )}
        <StickyActiebalk metTabbalk>
          <Button type="button" size="lg" className="w-full" onClick={() => (magNieuweTool ? setNieuwOpen(true) : setUpgradeOpen(true))}>
            <Plus className="h-5 w-5" aria-hidden="true" /> Nieuwe rekentool
          </Button>
        </StickyActiebalk>
      </div>

      {tools.length === 0 ? (
        <Card className="hidden md:block">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium text-foreground">Nog geen rekentools</p>
            <p className="max-w-sm text-sm text-muted-foreground">Maak je eerste rekentool, kies een paar onderdelen en zet hem op je website.</p>
            {nieuwKnop}
          </CardContent>
        </Card>
      ) : (
        <div className="hidden gap-4 md:grid [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
          {tools.map((t) => (
            <Kaart
              key={t.id}
              tool={t}
              magDupliceren={magNieuweTool}
              onVerwijderd={(naam) => {
                setMelding({ id: t.id, naam });
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      <NieuweRekentoolDialoog open={nieuwOpen} onClose={() => setNieuwOpen(false)} />
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        requiredPlan="PLUS"
        title="Limiet van rekentools bereikt"
        description={limiet ? `Je pakket biedt plek voor maximaal ${limiet} rekentool${limiet === 1 ? "" : "s"}. Upgrade voor meer.` : "Upgrade je pakket om meer rekentools te maken."}
      />
    </div>
  );
}

function KaartMobiel({ tool }: { tool: RekentoolKaartData }) {
  return (
    <Link href={`/dashboard/tools/${tool.id}`} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold text-foreground">{tool.naam}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={tool.live ? "success" : "muted"}>{tool.live ? "Live" : "Concept"}</Badge>
          <span className="text-sm text-muted-foreground">
            {tool.aantalWerkzaamheden} {tool.aantalWerkzaamheden === 1 ? "onderdeel" : "onderdelen"}
          </span>
        </span>
      </span>
      {tool.nieuweLeads > 0 && (
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">
          {tool.nieuweLeads} nieuw
        </span>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function Kaart({ tool, magDupliceren, onVerwijderd }: { tool: RekentoolKaartData; magDupliceren: boolean; onVerwijderd: (naam: string) => void }) {
  const [naam, setNaam] = useState(tool.naam);
  const [modus, setModus] = useState<"kaart" | "hernoem" | "verwijder">("kaart");
  const [tekst, setTekst] = useState(tool.naam);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function hernoem(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const r = await hernoemRekentoolAction(tool.id, tekst);
    setBezig(false);
    if (r.ok) {
      setNaam(tekst.trim());
      setModus("kaart");
      setFout(null);
    } else setFout(r.error);
  }

  async function verwijder() {
    setBezig(true);
    const r = await verwijderRekentoolAction(tool.id);
    setBezig(false);
    if (r.ok) onVerwijderd(naam);
    else setFout("Verwijderen is niet gelukt.");
  }

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4">
        {modus === "hernoem" ? (
          <form onSubmit={hernoem} className="flex flex-col gap-2">
            <label htmlFor={`naam-${tool.id}`} className="text-sm font-semibold text-foreground">
              Naam van je rekentool
            </label>
            <Input id={`naam-${tool.id}`} value={tekst} maxLength={80} autoFocus onChange={(e) => setTekst(e.target.value)} />
            {fout && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {fout}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="h-11" disabled={bezig}>
                <Check className="h-4 w-4" aria-hidden="true" /> Opslaan
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => { setModus("kaart"); setFout(null); }}>
                Annuleren
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words text-lg font-semibold text-foreground">{naam}</h2>
            <DropdownMenu
              ariaLabel={`Meer acties voor ${naam}`}
              className="h-11 w-11"
              items={[
                { label: "Naam wijzigen", icon: Pencil, onSelect: () => { setTekst(naam); setModus("hernoem"); } },
                {
                  label: "Dupliceren",
                  icon: Copy,
                  disabled: !magDupliceren,
                  onSelect: () => {
                    const fd = new FormData();
                    fd.set("toolId", tool.id);
                    void duplicateToolAction(fd);
                  },
                },
                { label: "Verwijderen", icon: Trash2, destructive: true, onSelect: () => setModus("verwijder") },
              ]}
            />
          </div>
        )}

        <Overlay
          open={modus === "verwijder"}
          onClose={() => !bezig && setModus("kaart")}
          ariaLabelledBy={`verwijder-${tool.id}`}
          className="flex items-center justify-center p-4"
        >
          <div
            role="alertdialog"
            className="animate-modal-in relative w-full max-w-sm rounded-xl border border-destructive bg-card p-5 shadow-lg"
          >
            <p id={`verwijder-${tool.id}`} className="text-lg font-semibold text-foreground">
              “{naam}” verwijderen?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              De link en de code op je website werken daarna niet meer. Je leads blijven bewaard. Je kunt dit direct ongedaan maken.
            </p>
            {fout && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {fout}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="button" variant="destructive" className="h-11 sm:flex-1" disabled={bezig} onClick={() => void verwijder()}>
                {bezig ? "Verwijderen…" : "Ja, verwijderen"}
              </Button>
              <Button type="button" variant="secondary" className="h-11 sm:flex-1" disabled={bezig} onClick={() => setModus("kaart")}>
                Nee, laat staan
              </Button>
            </div>
          </div>
        </Overlay>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="h-4 w-4" aria-hidden="true" />
            {tool.aantalWerkzaamheden} {tool.aantalWerkzaamheden === 1 ? "item" : "items"}
          </span>
          <Badge variant={tool.live ? "success" : "muted"}>{tool.live ? "Live op je website" : "Nog niet op je website"}</Badge>
        </div>

        <Link
          href={`/dashboard/leads?tool=${tool.id}`}
          className="inline-flex min-h-11 w-fit items-center rounded-md text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {tool.leadsDezeMaand} {tool.leadsDezeMaand === 1 ? "nieuwe lead" : "nieuwe leads"} deze maand
        </Link>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <LinkButton href={`/dashboard/tools/${tool.id}`} className="h-11">
            Openen
          </LinkButton>
          {tool.live && (
            <LinkButton href={tool.toolUrl} target="_blank" variant="ghost" className="h-11">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Bekijken
            </LinkButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NieuweRekentoolDialoog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function maak(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const r = await maakRekentoolAction(naam);
    if (r.ok) router.push(`/dashboard/tools/${r.id}?paneel=toevoegen`);
    else {
      setBezig(false);
      setFout(r.error);
    }
  }

  return (
    <Overlay open={open} onClose={onClose} ariaLabelledBy="nieuw-titel" className="flex items-center justify-center p-4">
      <form onSubmit={maak} className="relative flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 id="nieuw-titel" className="text-lg font-bold text-foreground">
          Nieuwe rekentool
        </h2>
        <label htmlFor="nieuw-naam" className="text-sm font-semibold text-foreground">
          Hoe heet je rekentool?
        </label>
        <Input id="nieuw-naam" value={naam} maxLength={80} autoFocus placeholder="Bijv. Tuinaanleg…" onChange={(e) => setNaam(e.target.value)} aria-invalid={fout ? true : undefined} />
        <p className="text-sm text-muted-foreground">Daarna kies je in de editor je onderdelen.</p>
        {fout && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {fout}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" className="h-11" disabled={bezig}>
            {bezig ? "Maken…" : "Maken en openen"}
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
