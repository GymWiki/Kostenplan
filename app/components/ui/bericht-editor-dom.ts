import { parseSjabloon } from "@/app/lib/sjabloon/render";
import { GROEPEN, variabeleVoorKey, type SjabloonContext } from "@/app/lib/sjabloon/variabelen";

// DOM-kant van de berichteditor: tekst met {variabelen} <-> een contenteditable met blokjes. Alle bewerkingen rekenen in tekenposities van
// de opgeslagen tekst (een blokje telt als zijn {key}), zodat invoegen, verplaatsen en verwijderen gewone tekstbewerkingen zijn
// (zie app/lib/sjabloon/render.ts) en de opslag altijd een gewone tekst met {key} blijft.

export type Punt = { node: Node; offset: number };

export const kleurStijl = (key: string, context: SjabloonContext): { kleur: string; bekend: boolean } => {
  const v = variabeleVoorKey(key);
  if (!v || !v.contexten.includes(context)) return { kleur: "onbekend", bekend: false };
  return { kleur: GROEPEN[v.groep].kleur, bekend: true };
};

export const chipStijl = (kleur: string) => `background:var(--chip-${kleur}-bg);color:var(--chip-${kleur}-fg);border-color:var(--chip-${kleur}-rand)`;

export const CHIP_KLASSE = "kp-chip mx-0.5 inline-flex min-h-7 max-w-full cursor-grab select-none items-center gap-1 rounded-md border px-1.5 align-baseline text-sm font-semibold leading-tight";

// Eén blokje in de tekst: alleen weergave; serialiseren geeft altijd {key}.
export function maakChip(key: string, context: SjabloonContext): HTMLElement {
  const { kleur, bekend } = kleurStijl(key, context);
  const v = variabeleVoorKey(key);
  const chip = document.createElement("span");
  chip.dataset.var = key;
  chip.contentEditable = "false";
  chip.draggable = true;
  chip.setAttribute("role", "group");
  const naam = bekend && v ? v.label : key;
  chip.setAttribute("aria-label", bekend ? `Variabele ${naam}` : `Onbekende variabele ${key}`);
  chip.title = bekend ? `${v!.label}: wordt automatisch ingevuld` : v ? `${v.label} is in dit bericht niet beschikbaar en blijft leeg` : `“${key}” kennen we niet (meer); dit blijft leeg. Verwijder of vervang het blokje.`;
  chip.className = CHIP_KLASSE + (bekend ? "" : " border-dashed");
  chip.setAttribute("style", chipStijl(kleur));
  const tekst = document.createElement("span");
  tekst.textContent = bekend ? naam : `⚠ ${key}`;
  chip.append(tekst);
  const x = document.createElement("button");
  x.type = "button";
  x.tabIndex = -1;
  x.dataset.verwijder = "";
  x.setAttribute("aria-label", `Verwijder blokje ${naam}`);
  x.className = "-mr-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-base leading-none opacity-70 hover:opacity-100";
  x.textContent = "×";
  chip.append(x);
  return chip;
}

// Zet de tekst als tekst en blokjes in de editor. Nieuwe regels worden <br>; een afsluitende nieuwe regel krijgt een vuller zodat hij zichtbaar is.
export function vulEditor(root: HTMLElement, tekst: string, context: SjabloonContext) {
  root.replaceChildren();
  for (const deel of parseSjabloon(tekst)) {
    if (deel.soort === "variabele") {
      root.append(maakChip(deel.key, context));
      continue;
    }
    deel.tekst.split("\n").forEach((regel, i) => {
      if (i > 0) root.append(document.createElement("br"));
      if (regel) root.append(document.createTextNode(regel));
    });
  }
  if (tekst.endsWith("\n")) {
    const vuller = document.createElement("br");
    vuller.dataset.vuller = "";
    root.append(vuller);
  }
}

export function serialiseerKnopen(ouder: Node): string {
  let uit = "";
  ouder.childNodes.forEach((k) => {
    if (k.nodeType === Node.TEXT_NODE) uit += (k.textContent ?? "").replace(/[​﻿]/g, "").replace(/ /g, " ");
    else if (k instanceof HTMLElement) {
      if (k.dataset.var !== undefined) uit += `{${k.dataset.var}}`;
      else if (k.tagName === "BR") {
        if (k.dataset.vuller === undefined) uit += "\n";
      } else if (k.tagName === "DIV" || k.tagName === "P") {
        if (uit !== "" && !uit.endsWith("\n")) uit += "\n";
        uit += serialiseerKnopen(k);
      } else uit += serialiseerKnopen(k);
    }
  });
  return uit;
}

const chipVan = (root: HTMLElement, node: Node | null): HTMLElement | null => {
  const el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  const chip = el?.closest<HTMLElement>("[data-var]") ?? null;
  return chip && root.contains(chip) ? chip : null;
};

// Positie in de opgeslagen tekst van een punt in de editor. Ligt het punt in een blokje, dan vóór of na het blokje.
export function puntNaarOffset(root: HTMLElement, punt: Punt, voorkeur: "voor" | "na" = "voor"): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  const chip = chipVan(root, punt.node);
  if (chip) {
    if (voorkeur === "voor") r.setEndBefore(chip);
    else r.setEndAfter(chip);
  } else r.setEnd(punt.node, punt.offset);
  return serialiseerKnopen(r.cloneContents()).length;
}

// Omgekeerd: het punt in de editor bij een positie in de tekst (midden in een blokje valt erachter).
export function offsetNaarPunt(root: HTMLElement, offset: number): Punt {
  let pos = 0;
  const kinderen = [...root.childNodes];
  for (let i = 0; i < kinderen.length; i++) {
    const k = kinderen[i]!;
    const lengte = serialiseerKnopen({ childNodes: [k] } as unknown as Node).length;
    if (k.nodeType === Node.TEXT_NODE) {
      if (offset <= pos + lengte) return { node: k, offset: Math.max(0, Math.min(k.textContent?.length ?? 0, offset - pos)) };
    } else {
      if (offset <= pos) return { node: root, offset: i };
      if (offset < pos + lengte) return { node: root, offset: i + 1 };
    }
    pos += lengte;
  }
  return { node: root, offset: root.childNodes.length };
}

export function selectieOffsets(root: HTMLElement): { start: number; eind: number } | null {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0) return null;
  const r = s.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  return { start: puntNaarOffset(root, { node: r.startContainer, offset: r.startOffset }, "voor"), eind: puntNaarOffset(root, { node: r.endContainer, offset: r.endOffset }, "na") };
}

export function zetCursor(root: HTMLElement, offset: number) {
  const p = offsetNaarPunt(root, offset);
  const r = document.createRange();
  r.setStart(p.node, p.offset);
  r.collapse(true);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

// Het punt in de editor onder een schermpositie (voor slepen), met het blokje als geheel: links van het midden = ervoor, rechts = erna.
export function puntVanCoordinaten(root: HTMLElement, x: number, y: number): { offset: number; rect: DOMRect | null } | null {
  let punt: Punt | null = null;
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    if (p) punt = { node: p.offsetNode, offset: p.offset };
  } else if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y);
    if (r) punt = { node: r.startContainer, offset: r.startOffset };
  }
  if (!punt || !root.contains(punt.node)) return null;
  const chip = chipVan(root, punt.node);
  if (chip) {
    const b = chip.getBoundingClientRect();
    const voor = x < b.left + b.width / 2;
    return { offset: puntNaarOffset(root, { node: chip, offset: 0 }, voor ? "voor" : "na"), rect: new DOMRect(voor ? b.left : b.right, b.top, 0, b.height) };
  }
  const offset = puntNaarOffset(root, punt);
  const r = document.createRange();
  r.setStart(punt.node, punt.offset);
  r.collapse(true);
  let rect: DOMRect | null = r.getClientRects()[0] ?? null;
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    const el = punt.node instanceof HTMLElement ? punt.node : punt.node.parentElement;
    const b = el?.getBoundingClientRect();
    rect = b ? new DOMRect(b.left, b.top, 0, Math.min(b.height, 24)) : null;
  }
  return { offset, rect };
}
