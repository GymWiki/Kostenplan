"use client";

import { useEffect, useRef, useState } from "react";

// Undo/redo voor de bouwer-config (Deel: "undo, redo" — ontbrak volledig in
// de vorige, modal-gebaseerde bouwer). Geschiedenis leeft in plain refs
// (geen React-state nodig voor de stacks zelf — alleen canUndo/canRedo
// hoeven een re-render te triggeren), en wordt UITSLUITEND gemuteerd vanuit
// synchrone aanroepen (setConfig/undo/redo), nooit vanuit een setState-
// updaterfunctie — dat zou bij React's dubbele dev-aanroep van updaters
// (Strict Mode) de stack per ongeluk twee keer kunnen vullen.
export function useConfigHistory<T>(initieel: T) {
  const [config, setConfigRaw] = useState(initieel);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);
  // Snelle opeenvolgende wijzigingen (bijv. elk toetsaanslag tijdens het
  // typen van een label) worden binnen dit venster samengevoegd tot één
  // undo-stap — anders zou Ctrl+Z letter voor letter terugtypen in plaats
  // van bijv. een hele naamwijziging in één keer terug te draaien. Een pauze
  // langer dan dit venster, óf handmatig via resetGroepering() (bijv. bij
  // het wisselen van geselecteerd item), start een nieuwe undo-stap.
  const GROEPERING_MS = 800;
  const laatstePushOp = useRef(0);

  function setConfig(next: T) {
    if (next === config) return;
    const nu = Date.now();
    if (nu - laatstePushOp.current > GROEPERING_MS) {
      undoStack.current.push(config);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
      setCanUndo(true);
      setCanRedo(false);
    }
    laatstePushOp.current = nu;
    setConfigRaw(next);
  }

  function resetGroepering() {
    laatstePushOp.current = 0;
  }

  function undo() {
    const vorige = undoStack.current.pop();
    if (vorige === undefined) return;
    redoStack.current.push(config);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    setConfigRaw(vorige);
  }

  function redo() {
    const volgende = redoStack.current.pop();
    if (volgende === undefined) return;
    undoStack.current.push(config);
    setCanRedo(redoStack.current.length > 0);
    setCanUndo(true);
    setConfigRaw(volgende);
  }

  // Ctrl/Cmd+Z en Ctrl/Cmd+Shift+Z — de effect-body zelf roept geen setState
  // aan (registreert alleen een listener), de listener zelf reageert op een
  // echte browser-gebeurtenis, precies zoals Escape-afhandeling elders in
  // de app (zie app/components/ui/overlay.tsx).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return { config, setConfig, undo, redo, canUndo, canRedo, resetGroepering };
}
