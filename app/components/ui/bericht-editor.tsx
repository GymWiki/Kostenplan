"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { onbekendeTokens, ontbrekendeVerplichte, renderTemplate, verplaatsVariabele, verwijderVariabeleOp, voegVariabeleIn } from "@/app/lib/sjabloon/render";
import { GROEPEN, groepenVoor, voorbeeldWaarden, variabelenVoor, type SjabloonContext, type Variabele } from "@/app/lib/sjabloon/variabelen";
import { puntVanCoordinaten, selectieOffsets, serialiseerKnopen, vulEditor, zetCursor } from "./bericht-editor-dom";

const VAR_TYPE = "application/x-kp-variabele";
const VAN_TYPE = "application/x-kp-van";

const DOCUMENT_WOORD: Record<SjabloonContext, string> = { offerte: "offerte", factuur: "factuur", afwijzing: "aanvraag", titel: "rekentool", voorwaarden: "offerte" };

// Een bericht met variabelen als gekleurde blokjes. De tekst blijft een gewone string met {key}-aanduidingen (bestaande teksten werken
// zonder migratie); een blokje is alleen weergave. Blokjes sleep je vanuit "Variabelen" naar een plek in de tekst (of tik erop om ze op de
// cursor in te voegen), en blokjes in de tekst zijn te verplaatsen of te verwijderen. Gebouwd met een contenteditable, zonder extra library.
export function BerichtEditor({
  label,
  hint,
  waarde,
  onChange,
  context,
  minHoogte = "11rem",
  beschrijving,
}: {
  label: string;
  hint?: React.ReactNode;
  waarde: string;
  onChange: (tekst: string) => void;
  context: SjabloonContext;
  minHoogte?: string;
  // Standaard: "per offerte" (afgeleid van de context).
  beschrijving?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const kader = useRef<HTMLDivElement>(null);
  const laatsteCursor = useRef<number | null>(null);
  const laatsteEind = useRef<number | null>(null);
  const huidig = useRef(waarde);
  const [indicator, setIndicator] = useState<{ x: number; y: number; h: number } | null>(null);
  const [melding, setMelding] = useState("");

  useLayoutEffect(() => {
    huidig.current = waarde;
  }, [waarde]);

  // Van buiten gewijzigd (bijv. "Standaardtekst herstellen"): de editor opnieuw opbouwen. Eigen typen verandert de editor al zelf.
  useLayoutEffect(() => {
    const el = root.current;
    if (el && serialiseerKnopen(el) !== waarde) vulEditor(el, waarde, context);
  }, [waarde, context]);

  // Onthoud de laatste cursor in de tekst, ook als de focus naar een knop of naar buiten gaat (voor "tik om in te voegen").
  useEffect(() => {
    const onSel = () => {
      const el = root.current;
      const s = el && document.activeElement === el ? selectieOffsets(el) : null;
      if (s) {
        laatsteCursor.current = s.start;
        laatsteEind.current = s.eind;
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  // Past een nieuwe tekst toe: editor opnieuw opbouwen en (als hij focus heeft) de cursor op de juiste plek.
  const pasToe = useCallback(
    (tekst: string, cursor: number, focus: boolean) => {
      const el = root.current;
      if (!el) return;
      huidig.current = tekst;
      vulEditor(el, tekst, context);
      laatsteCursor.current = cursor;
      if (focus) {
        el.focus({ preventScroll: true });
        zetCursor(el, cursor);
      }
      onChange(tekst);
    },
    [context, onChange]
  );

  const voegIn = useCallback(
    (v: Variabele) => {
      const el = root.current;
      const focus = el !== null && document.activeElement === el;
      // De knop heeft de focus (anders werkt slepen niet): de onthouden cursor of selectie in het bericht telt; een selectie wordt vervangen.
      const start = (focus && el ? selectieOffsets(el)?.start : null) ?? laatsteCursor.current ?? huidig.current.length;
      const eind = (focus && el ? selectieOffsets(el)?.eind : null) ?? laatsteEind.current ?? start;
      const basis = eind !== start ? huidig.current.slice(0, start) + huidig.current.slice(eind) : huidig.current;
      const r = voegVariabeleIn(basis, Math.min(start, basis.length), v.key);
      laatsteEind.current = r.cursor;
      pasToe(r.tekst, r.cursor, focus);
      setMelding(`Blokje ${v.label} ingevoegd.`);
    },
    [pasToe]
  );

  const invoer = () => {
    const el = root.current;
    if (!el) return;
    const tekst = serialiseerKnopen(el);
    huidig.current = tekst;
    onChange(tekst);
  };

  function bijToets(e: React.KeyboardEvent<HTMLDivElement>) {
    const el = root.current;
    if (!el || e.nativeEvent.isComposing) return;
    const s = selectieOffsets(el);
    if (e.key === "Enter") {
      // Altijd een gewone nieuwe regel (geen <div>): de opslag is platte tekst.
      e.preventDefault();
      if (!s) return;
      const t = huidig.current;
      pasToe(t.slice(0, s.start) + "\n" + t.slice(s.eind), s.start + 1, true);
    } else if ((e.key === "Backspace" || e.key === "Delete") && s && s.start === s.eind) {
      // Naast een blokje: het hele blokje weg.
      const t = huidig.current;
      const links = e.key === "Backspace" ? /\{\w+\}$/.exec(t.slice(0, s.start)) : null;
      const rechts = e.key === "Delete" ? /^\{\w+\}/.exec(t.slice(s.start)) : null;
      const pos = links ? s.start - links[0].length : rechts ? s.start : -1;
      if (pos >= 0) {
        e.preventDefault();
        const r = verwijderVariabeleOp(t, pos);
        pasToe(r.tekst, r.cursor, true);
      }
    }
  }

  function bijKlik(e: React.MouseEvent<HTMLDivElement>) {
    const knop = (e.target as HTMLElement).closest<HTMLElement>("[data-verwijder]");
    const chip = knop?.closest<HTMLElement>("[data-var]");
    const el = root.current;
    if (!knop || !chip || !el) return;
    e.preventDefault();
    const offset = offsetVanChip(el, chip);
    const r = verwijderVariabeleOp(huidig.current, offset);
    pasToe(r.tekst, r.cursor, true);
  }

  function bijPlakken(e: React.ClipboardEvent<HTMLDivElement>) {
    const el = root.current;
    if (!el) return;
    // Alleen platte tekst: geen opmaak of HTML uit andere programma's. {aanduidingen} in de tekst worden vanzelf blokjes.
    e.preventDefault();
    const tekst = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    const s = selectieOffsets(el) ?? { start: huidig.current.length, eind: huidig.current.length };
    const t = huidig.current;
    pasToe(t.slice(0, s.start) + tekst + t.slice(s.eind), s.start + tekst.length, true);
  }

  function bijKopieren(e: React.ClipboardEvent<HTMLDivElement>, knip: boolean) {
    const el = root.current;
    const s = el ? selectieOffsets(el) : null;
    if (!el || !s || s.start === s.eind) return;
    // De opgeslagen vorm, met {key}: plakken geeft weer blokjes (ook in een ander bericht).
    e.preventDefault();
    e.clipboardData.setData("text/plain", huidig.current.slice(s.start, s.eind));
    if (knip) pasToe(huidig.current.slice(0, s.start) + huidig.current.slice(s.eind), s.start, true);
  }

  function bijSleepStart(e: React.DragEvent<HTMLDivElement>) {
    const chip = (e.target as HTMLElement).closest?.<HTMLElement>("[data-var]");
    const el = root.current;
    if (!chip || !el) return;
    e.dataTransfer.setData(VAR_TYPE, chip.dataset.var ?? "");
    e.dataTransfer.setData(VAN_TYPE, String(offsetVanChip(el, chip)));
    e.dataTransfer.setData("text/plain", `{${chip.dataset.var}}`);
    e.dataTransfer.effectAllowed = "move";
  }

  const isVariabeleSleep = (e: React.DragEvent) => [...e.dataTransfer.types].includes(VAR_TYPE);

  function bijSleepOver(e: React.DragEvent<HTMLDivElement>) {
    const el = root.current;
    const k = kader.current;
    if (!el || !k || !isVariabeleSleep(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = [...e.dataTransfer.types].includes(VAN_TYPE) ? "move" : "copy";
    const p = puntVanCoordinaten(el, e.clientX, e.clientY);
    const kr = k.getBoundingClientRect();
    setIndicator(p?.rect ? { x: p.rect.left - kr.left, y: p.rect.top - kr.top, h: Math.max(p.rect.height, 20) } : null);
  }

  function bijDrop(e: React.DragEvent<HTMLDivElement>) {
    const el = root.current;
    setIndicator(null);
    if (!el || !isVariabeleSleep(e)) return;
    e.preventDefault();
    const key = e.dataTransfer.getData(VAR_TYPE);
    const van = e.dataTransfer.getData(VAN_TYPE);
    const doel = puntVanCoordinaten(el, e.clientX, e.clientY);
    const naar = doel ? doel.offset : huidig.current.length;
    const r = van !== "" ? verplaatsVariabele(huidig.current, Number(van), naar) : voegVariabeleIn(huidig.current, naar, key);
    pasToe(r.tekst, r.cursor, true);
  }

  const groepen = groepenVoor(context);
  const onbekend = onbekendeTokens(waarde, context);
  const verplicht = variabelenVoor(context).flatMap((v) => (v.verplichtIn ?? []).filter((x) => x.context === context).map((x) => ({ key: v.key, waarschuwing: x.waarschuwing })));
  const ontbreekt = ontbrekendeVerplichte(waarde, context, verplicht);
  const woord = beschrijving ?? DOCUMENT_WOORD[context];
  const voorbeeld = renderTemplate(waarde, voorbeeldWaarden(context));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span id={`${id}-label`} className="text-sm font-semibold text-foreground">
          {label}
        </span>

        <fieldset className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <legend className="px-1 text-sm font-semibold text-foreground">Variabelen</legend>
          <p id={`${id}-uitleg`} className="text-sm text-muted-foreground">
            Sleep een blokje naar de plek in je bericht, of tik erop om het op de plek van je cursor in te voegen. Dit wordt automatisch ingevuld per {woord}.
          </p>
          <div className="flex flex-col gap-2">
            {groepen.map((g) => (
              <div key={g.sleutel} role="group" aria-label={g.label} className="flex flex-wrap items-center gap-1.5">
                <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground min-[480px]:w-auto min-[480px]:min-w-28">{g.label}</span>
                {g.variabelen.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    draggable
                    title={v.uitleg}
                    aria-label={`${v.label} invoegen`}
                    onClick={() => voegIn(v)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(VAR_TYPE, v.key);
                      e.dataTransfer.setData("text/plain", `{${v.key}}`);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setIndicator(null)}
                    className="inline-flex min-h-11 cursor-grab touch-manipulation items-center gap-1 rounded-md border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
                    style={styleVan(GROEPEN[v.groep].kleur)}
                  >
                    <span aria-hidden="true" className="select-none opacity-60">
                      ⠿
                    </span>
                    {v.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </fieldset>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>

      <div ref={kader} className="relative">
        <div
          ref={root}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-uitleg`}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-bericht-editor=""
          onInput={invoer}
          onKeyDown={bijToets}
          onMouseDown={(e) => {
            // Zonder dit verliest de editor de focus, wordt hij bij blur opnieuw opgebouwd en komt de klik op × nergens aan.
            if ((e.target as HTMLElement).closest("[data-verwijder]")) e.preventDefault();
          }}
          onClick={bijKlik}
          onPaste={bijPlakken}
          onCopy={(e) => bijKopieren(e, false)}
          onCut={(e) => bijKopieren(e, true)}
          onDragStart={bijSleepStart}
          onDragOver={bijSleepOver}
          onDragLeave={() => setIndicator(null)}
          onDragEnd={() => setIndicator(null)}
          onDrop={bijDrop}
          onBlur={() => {
            // Een {aanduiding} die je zelf hebt getypt wordt nu een blokje.
            const el = root.current;
            if (el && /\{\w+\}/.test(serialiseerKnopen(el))) vulEditor(el, serialiseerKnopen(el), context);
          }}
          style={{ minHeight: minHoogte }}
          className={cn(
            "w-full whitespace-pre-wrap break-words rounded-md border-[1.5px] border-input bg-card px-3 py-2 text-base leading-7 text-foreground outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
          )}
        />
        {indicator && <span aria-hidden="true" data-drop-indicator="" className="pointer-events-none absolute w-0.5 rounded bg-primary" style={{ left: indicator.x, top: indicator.y, height: indicator.h }} />}
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {melding}
      </span>

      {(onbekend.length > 0 || ontbreekt.length > 0) && (
        <ul className="flex flex-col gap-1.5" data-bericht-waarschuwingen="">
          {onbekend.map((k) => (
            <li key={k} className="flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                <strong>{`{${k}}`}</strong> is in dit bericht geen bekende variabele en blijft leeg. Vervang het door een blokje, of verwijder het.
              </span>
            </li>
          ))}
          {ontbreekt.map((w) => (
            <li key={w} className="flex items-start gap-2 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3" data-bericht-voorbeeld="">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zo ziet je klant het, met voorbeeldgegevens</p>
        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{voorbeeld || <span className="text-muted-foreground">Nog geen tekst.</span>}</div>
      </div>
    </div>
  );
}

const styleVan = (kleur: string): React.CSSProperties => ({ background: `var(--chip-${kleur}-bg)`, color: `var(--chip-${kleur}-fg)`, borderColor: `var(--chip-${kleur}-rand)` });

// Positie (in de opgeslagen tekst) waar dit blokje begint.
function offsetVanChip(root: HTMLElement, chip: HTMLElement): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEndBefore(chip);
  return serialiseerKnopen(r.cloneContents()).length;
}
