"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, HelpCircle, Coins, Plus, Puzzle, Trash2 } from "lucide-react";
import type { CalculatorField, OnderdeelConfig, PriceRule, ValidatieMelding } from "@/app/lib/calculator-engine";
import { duplicateOnderdeelAction, addOnderdeelFromBibliotheekAction } from "@/app/lib/actions/onderdelen";
import type { OnderdeelBibliotheek } from "@/app/generated/prisma/client";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { Switch } from "@/app/components/ui/switch";
import { SortableList, DragHandle } from "@/app/components/ui/sortable-list";
import { DropdownMenu } from "@/app/components/ui/dropdown-menu";
import { getProductIcon } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";
import { OnderdeelToevoegenModal } from "./onderdeel-toevoegen-modal";
import { StatusIndicator, type BouwerStatus } from "./status-indicator";
import { veldMeta } from "./veld-soort-labels";
import { regelSamenvatting } from "./regel-samenvatting";
import { genereerId } from "./id-utils";
import { nieuwRegelId } from "./regel-id-utils";
import { beschikbareVariabelen } from "./variabelen-utils";

export type Selectie =
  | { soort: "onderdeel"; onderdeelId: string }
  | { soort: "veld"; onderdeelId: string; veldId: string }
  | { soort: "regel"; onderdeelId: string; regelId: string };

function selectieGelijk(a: Selectie | null, b: Selectie): boolean {
  if (!a) return false;
  if (a.soort !== b.soort) return false;
  if (a.soort === "onderdeel" && b.soort === "onderdeel") return a.onderdeelId === b.onderdeelId;
  if (a.soort === "veld" && b.soort === "veld") return a.onderdeelId === b.onderdeelId && a.veldId === b.veldId;
  if (a.soort === "regel" && b.soort === "regel") return a.onderdeelId === b.onderdeelId && a.regelId === b.regelId;
  return false;
}

function statusVoorOnderdeel(onderdeel: OnderdeelConfig, meldingen: ValidatieMelding[]): BouwerStatus {
  if (!onderdeel.actief) return "concept";
  const heeftFout = meldingen.some(
    (m) => m.ernst === "FOUT" && (m.boodschap.startsWith(`Onderdeel "${onderdeel.naam}"`) || m.boodschap.startsWith(`${onderdeel.naam}:`))
  );
  return heeftFout ? "actie-nodig" : "klaar";
}

function heeftVeldFout(veldId: string, meldingen: ValidatieMelding[]): boolean {
  return meldingen.some((m) => m.ernst === "FOUT" && m.veldId === veldId);
}
function heeftRegelFout(regelId: string, meldingen: ValidatieMelding[]): boolean {
  return meldingen.some((m) => m.ernst === "FOUT" && m.regelId === regelId);
}

// Kolom 1 van de drie-koloms bouwer ("Componenten"): een uitklapbare boom
// van Onderdelen -> Vragen/Prijsregels. Vervangt onderdelen-tab.tsx +
// onderdeel-editor-overlay.tsx (die een heel Onderdeel in een volledig-
// scherm overlay opende) — hier is elk item gewoon een selecteerbare rij;
// wat je bewerkt verschijnt inline in kolom 2 (zie onderdelen-bouwer.tsx).
export function BuilderTree({
  toolId,
  onderdelen,
  onChange,
  meldingen,
  selectie,
  onSelect,
  onderdeelBibliotheek,
  onJustCreated,
}: {
  toolId: string;
  onderdelen: OnderdeelConfig[];
  onChange: (onderdelen: OnderdeelConfig[]) => void;
  meldingen: ValidatieMelding[];
  selectie: Selectie | null;
  onSelect: (selectie: Selectie) => void;
  onderdeelBibliotheek: OnderdeelBibliotheek[];
  onJustCreated: (id: string | null) => void;
}) {
  const [toevoegenOpen, setToevoegenOpen] = useState(false);
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(() => new Set(selectie ? [selectie.onderdeelId] : []));
  const [verwijderOnderdeel, setVerwijderOnderdeel] = useState<OnderdeelConfig | null>(null);
  const [verwijderVeld, setVerwijderVeld] = useState<{ onderdeelId: string; veld: CalculatorField } | null>(null);
  const [verwijderRegel, setVerwijderRegel] = useState<{ onderdeelId: string; regel: PriceRule } | null>(null);
  const [bezigId, setBezigId] = useState<string | null>(null);

  const gesorteerd = [...onderdelen].sort((a, b) => a.order - b.order);

  function toggleUitgeklapt(id: string) {
    setUitgeklapt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function klapUit(id: string) {
    setUitgeklapt((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  function selecteerOnderdeel(onderdeel: OnderdeelConfig) {
    onJustCreated(null);
    onSelect({ soort: "onderdeel", onderdeelId: onderdeel.id });
  }

  function herordenOnderdelen(nieuw: OnderdeelConfig[]) {
    onChange(nieuw.map((o, i) => ({ ...o, order: i })));
  }

  function toggleOnderdeelActief(onderdeel: OnderdeelConfig) {
    onChange(onderdelen.map((o) => (o.id === onderdeel.id ? { ...o, actief: !o.actief } : o)));
  }

  function verwijderOnderdeelBevestigd(onderdeel: OnderdeelConfig) {
    herordenOnderdelen(gesorteerd.filter((o) => o.id !== onderdeel.id));
    setVerwijderOnderdeel(null);
  }

  function voegOnderdeelToe(nieuwOnderdeel: OnderdeelConfig) {
    onChange([...onderdelen, { ...nieuwOnderdeel, order: onderdelen.length }]);
    setToevoegenOpen(false);
    klapUit(nieuwOnderdeel.id);
    onJustCreated(null);
    onSelect({ soort: "onderdeel", onderdeelId: nieuwOnderdeel.id });
  }

  async function dupliceerOnderdeel(onderdeel: OnderdeelConfig) {
    setBezigId(onderdeel.id);
    const result = await duplicateOnderdeelAction(toolId, onderdeel.id);
    setBezigId(null);
    if (result.success) onChange([...onderdelen, result.onderdeel]);
  }

  async function voegToeVanuitBibliotheek(bibliotheekId: string) {
    const result = await addOnderdeelFromBibliotheekAction(toolId, bibliotheekId);
    if (result.success) voegOnderdeelToe(result.onderdeel);
  }

  function wijzigOnderdeel(onderdeelId: string, patch: (o: OnderdeelConfig) => OnderdeelConfig) {
    onChange(onderdelen.map((o) => (o.id === onderdeelId ? patch(o) : o)));
  }

  function voegVeldToe(onderdeel: OnderdeelConfig) {
    const bestaandeIds = new Set(onderdeel.velden.map((v) => v.id));
    const id = genereerId("nieuwe-vraag", bestaandeIds);
    const nieuwVeld: CalculatorField = { id, label: "", verplicht: true, soort: "NUMMER" };
    wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, velden: [...o.velden, nieuwVeld] }));
    klapUit(onderdeel.id);
    onJustCreated(id);
    onSelect({ soort: "veld", onderdeelId: onderdeel.id, veldId: id });
  }

  function dupliceerVeld(onderdeel: OnderdeelConfig, veld: CalculatorField) {
    if (veld.soort === "PRODUCT_KEUZE") return; // zie velden-tab.tsx: onveilig voor materialCategoryId
    const nieuweId = genereerId(`${veld.label} kopie`, new Set(onderdeel.velden.map((v) => v.id)));
    wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, velden: [...o.velden, { ...veld, id: nieuweId, label: `${veld.label} (kopie)` }] }));
  }

  function verwijderVeldBevestigd(onderdeelId: string, veld: CalculatorField) {
    wijzigOnderdeel(onderdeelId, (o) => ({ ...o, velden: o.velden.filter((v) => v.id !== veld.id) }));
    setVerwijderVeld(null);
  }

  function voegRegelToe(onderdeel: OnderdeelConfig) {
    const id = nieuwRegelId(new Set(onderdeel.regels.map((r) => r.id)));
    const nieuweRegel: PriceRule = {
      id,
      label: "",
      categorie: "OVERIG",
      actief: true,
      intern: false,
      toonInUitsplitsing: true,
      type: "VAST",
      bedrag: { kind: "GETAL", waarde: 0 },
    };
    wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, regels: [...o.regels, nieuweRegel] }));
    klapUit(onderdeel.id);
    onJustCreated(id);
    onSelect({ soort: "regel", onderdeelId: onderdeel.id, regelId: id });
  }

  function dupliceerRegel(onderdeel: OnderdeelConfig, regel: PriceRule) {
    const nieuweId = nieuwRegelId(new Set(onderdeel.regels.map((r) => r.id)));
    wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, regels: [...o.regels, { ...regel, id: nieuweId, label: `${regel.label} (kopie)` }] }));
  }

  function verwijderRegelBevestigd(onderdeelId: string, regel: PriceRule) {
    wijzigOnderdeel(onderdeelId, (o) => ({ ...o, regels: o.regels.filter((r) => r.id !== regel.id) }));
    setVerwijderRegel(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Componenten</h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => setToevoegenOpen(true)} aria-label="Onderdeel toevoegen">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {gesorteerd.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Puzzle className="h-5 w-5" />
          </span>
          <p className="px-3 text-sm text-muted-foreground">Nog geen onderdelen. Begin met je eerste onderdeel.</p>
          <Button type="button" size="sm" onClick={() => setToevoegenOpen(true)}>
            <Plus className="h-4 w-4" />
            Onderdeel toevoegen
          </Button>
        </div>
      ) : (
        <SortableList
          dndContextId="onderdelen-boom"
          items={gesorteerd}
          onReorder={herordenOnderdelen}
          renderItem={(onderdeel, dragHandleProps) => {
            const Icon = getProductIcon(onderdeel.icoon) ?? Puzzle;
            const status = statusVoorOnderdeel(onderdeel, meldingen);
            const isUitgeklapt = uitgeklapt.has(onderdeel.id);
            const isGeselecteerd = selectieGelijk(selectie, { soort: "onderdeel", onderdeelId: onderdeel.id });

            return (
              <div className={cn("rounded-xl border transition-colors", dragHandleProps.isDragging && "shadow-lg", isGeselecteerd ? "border-primary bg-primary/5" : "border-border bg-card")}>
                <div className="flex items-center gap-1 py-2 pr-1.5 pl-1">
                  <DragHandle {...dragHandleProps} />
                  <button type="button" onClick={() => toggleUitgeklapt(onderdeel.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" aria-label={isUitgeklapt ? "Inklappen" : "Uitklappen"}>
                    {isUitgeklapt ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <button type="button" onClick={() => selecteerOnderdeel(onderdeel)} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-1.5 py-1 text-left">
                    {/* w-full + min-w-0 op elke schakel tot aan de titel-span:
                        `items-start` op deze knop (i.p.v. de flex-default
                        `stretch`) laat kinderen anders sizen op hun eigen
                        inhoud in plaats van op de (al ingekrompen) breedte
                        van de knop, waardoor min-w-0/truncate geen krimpruimte
                        kregen en een lange onderdeelnaam over de status-badge
                        heen bleef doorlopen i.p.v. af te breken. */}
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{onderdeel.naam || "Naamloos onderdeel"}</span>
                      <StatusIndicator status={status} />
                    </span>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {onderdeel.velden.length} {onderdeel.velden.length === 1 ? "vraag" : "vragen"} · {onderdeel.regels.length} {onderdeel.regels.length === 1 ? "prijsregel" : "prijsregels"}
                    </span>
                  </button>
                  <Switch checked={onderdeel.actief} onChange={() => toggleOnderdeelActief(onderdeel)} aria-label={onderdeel.actief ? "Onderdeel uitschakelen" : "Onderdeel inschakelen"} />
                  <DropdownMenu
                    ariaLabel={`Meer acties voor ${onderdeel.naam}`}
                    items={[
                      { label: bezigId === onderdeel.id ? "Bezig met dupliceren…" : "Dupliceren", icon: Copy, onSelect: () => dupliceerOnderdeel(onderdeel), disabled: bezigId === onderdeel.id },
                      { label: "Verwijderen", icon: Trash2, onSelect: () => setVerwijderOnderdeel(onderdeel), destructive: true },
                    ]}
                  />
                </div>

                {isUitgeklapt && (
                  <div className="flex flex-col gap-3 border-t border-border px-2 py-2 pl-9">
                    <SubLijst
                      titel="Vragen"
                      leegIcon={HelpCircle}
                      leegTekst="Nog geen vragen"
                      onToevoegen={() => voegVeldToe(onderdeel)}
                      toevoegenLabel="Vraag toevoegen"
                    >
                      {onderdeel.velden.length > 0 && (
                        <SortableList
                          dndContextId={`velden-${onderdeel.id}`}
                          items={onderdeel.velden}
                          onReorder={(velden) => wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, velden }))}
                          renderItem={(veld, dh) => (
                            <SubRij
                              dragHandleProps={dh}
                              titel={veld.label || "Naamloze vraag"}
                              meta={veldMeta(veld)}
                              fout={heeftVeldFout(veld.id, meldingen)}
                              geselecteerd={selectieGelijk(selectie, { soort: "veld", onderdeelId: onderdeel.id, veldId: veld.id })}
                              onSelect={() => {
                                onJustCreated(null);
                                onSelect({ soort: "veld", onderdeelId: onderdeel.id, veldId: veld.id });
                              }}
                              menuItems={[
                                ...(veld.soort === "PRODUCT_KEUZE" ? [] : [{ label: "Dupliceren", icon: Copy, onSelect: () => dupliceerVeld(onderdeel, veld) }]),
                                { label: "Verwijderen", icon: Trash2, onSelect: () => setVerwijderVeld({ onderdeelId: onderdeel.id, veld }), destructive: true },
                              ]}
                            />
                          )}
                        />
                      )}
                    </SubLijst>

                    <SubLijst
                      titel="Prijsregels"
                      leegIcon={Coins}
                      leegTekst="Nog geen prijsregels"
                      onToevoegen={() => voegRegelToe(onderdeel)}
                      toevoegenLabel="Prijsregel toevoegen"
                    >
                      {onderdeel.regels.length > 0 && (
                        <SortableList
                          dndContextId={`regels-${onderdeel.id}`}
                          items={onderdeel.regels}
                          onReorder={(regels) => wijzigOnderdeel(onderdeel.id, (o) => ({ ...o, regels }))}
                          renderItem={(regel, dh) => (
                            <SubRij
                              dragHandleProps={dh}
                              titel={regel.label || "Naamloze prijsregel"}
                              meta={regelSamenvatting(regel, beschikbareVariabelen(onderdeel.velden, onderdeel.afgeleideVariabelen))}
                              fout={heeftRegelFout(regel.id, meldingen)}
                              gedimd={!regel.actief}
                              geselecteerd={selectieGelijk(selectie, { soort: "regel", onderdeelId: onderdeel.id, regelId: regel.id })}
                              onSelect={() => {
                                onJustCreated(null);
                                onSelect({ soort: "regel", onderdeelId: onderdeel.id, regelId: regel.id });
                              }}
                              menuItems={[
                                { label: "Dupliceren", icon: Copy, onSelect: () => dupliceerRegel(onderdeel, regel) },
                                { label: "Verwijderen", icon: Trash2, onSelect: () => setVerwijderRegel({ onderdeelId: onderdeel.id, regel }), destructive: true },
                              ]}
                            />
                          )}
                        />
                      )}
                    </SubLijst>
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      {toevoegenOpen && (
        <OnderdeelToevoegenModal
          toolId={toolId}
          onClose={() => setToevoegenOpen(false)}
          onToegevoegd={voegOnderdeelToe}
          onderdeelBibliotheek={onderdeelBibliotheek}
          onKiesUitBibliotheek={voegToeVanuitBibliotheek}
        />
      )}

      <ConfirmDialog
        open={verwijderOnderdeel != null}
        onClose={() => setVerwijderOnderdeel(null)}
        onConfirm={() => verwijderOnderdeel && verwijderOnderdeelBevestigd(verwijderOnderdeel)}
        title={`"${verwijderOnderdeel?.naam}" verwijderen?`}
        description="Dit onderdeel en al zijn vragen en prijsregels worden verwijderd uit deze rekentool."
      />
      <ConfirmDialog
        open={verwijderVeld != null}
        onClose={() => setVerwijderVeld(null)}
        onConfirm={() => verwijderVeld && verwijderVeldBevestigd(verwijderVeld.onderdeelId, verwijderVeld.veld)}
        title={`"${verwijderVeld?.veld.label || "Deze vraag"}" verwijderen?`}
        description="Prijsregels die naar deze vraag verwijzen werken hierna niet meer — je krijgt daar een melding van."
      />
      <ConfirmDialog
        open={verwijderRegel != null}
        onClose={() => setVerwijderRegel(null)}
        onConfirm={() => verwijderRegel && verwijderRegelBevestigd(verwijderRegel.onderdeelId, verwijderRegel.regel)}
        title={`"${verwijderRegel?.regel.label || "Deze prijsregel"}" verwijderen?`}
        description="Deze prijsregel telt hierna niet meer mee in de berekening."
      />
    </div>
  );
}

function SubLijst({
  titel,
  leegIcon: LeegIcon,
  leegTekst,
  onToevoegen,
  toevoegenLabel,
  children,
}: {
  titel: string;
  leegIcon: React.ComponentType<{ className?: string }>;
  leegTekst: string;
  onToevoegen: () => void;
  toevoegenLabel: string;
  children: React.ReactNode;
}) {
  const heeftInhoud = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titel}</span>
        <Button type="button" size="sm" variant="ghost" onClick={onToevoegen} aria-label={toevoegenLabel}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {heeftInhoud ? (
        children
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
          <LeegIcon className="h-3.5 w-3.5 shrink-0" />
          {leegTekst}
        </div>
      )}
    </div>
  );
}

function SubRij({
  dragHandleProps,
  titel,
  meta,
  fout,
  gedimd,
  geselecteerd,
  onSelect,
  menuItems,
}: {
  dragHandleProps: Parameters<typeof DragHandle>[0];
  titel: string;
  meta: string;
  fout?: boolean;
  gedimd?: boolean;
  geselecteerd: boolean;
  onSelect: () => void;
  menuItems: { label: string; icon: React.ComponentType<{ className?: string }>; onSelect: () => void; destructive?: boolean }[];
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-md border py-1.5 pr-1 pl-0.5", geselecteerd ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary/50", gedimd && "opacity-60")}>
      <DragHandle {...dragHandleProps} />
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 flex-col items-start gap-0 rounded px-1 py-0.5 text-left">
        <span className="flex w-full min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{titel}</span>
          {fout && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-label="Bevat een fout" />}
        </span>
        <span className="w-full truncate text-xs text-muted-foreground">{meta}</span>
      </button>
      <DropdownMenu ariaLabel={`Meer acties voor ${titel}`} items={menuItems} />
    </div>
  );
}
