"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";

const SLEUTEL_SESSIES = "kp:sessies";
const SLEUTEL_WEG = "kp:installatietip-weg";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function leesGetal(sleutel: string): number {
  try {
    return Number(window.localStorage.getItem(sleutel)) || 0;
  } catch {
    return 0;
  }
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Registreert de app-schil (service worker) en toont na de tweede sessie, op
// mobiel, eenmalig de tip om Kostenplan op het beginscherm te zetten. De tip
// is weg te klikken en komt daarna niet terug.
export function PwaBasis() {
  const [tip, setTip] = useState(false);
  const [uitleg, setUitleg] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    try {
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    } catch {
      // geen service worker: de site werkt gewoon
    }

    function bijInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    }
    window.addEventListener("beforeinstallprompt", bijInstallPrompt);

    // Eén telling per browsersessie.
    try {
      if (!window.sessionStorage.getItem("kp:sessie-geteld")) {
        window.sessionStorage.setItem("kp:sessie-geteld", "1");
        window.localStorage.setItem(SLEUTEL_SESSIES, String(leesGetal(SLEUTEL_SESSIES) + 1));
      }
    } catch {
      // opslag geblokkeerd: dan geen tip
    }
    const mobiel = window.matchMedia("(max-width: 767px)").matches;
    if (mobiel && !isStandalone() && leesGetal(SLEUTEL_SESSIES) >= 2 && leesGetal(SLEUTEL_WEG) === 0) {
      const t = setTimeout(() => setTip(true), 0);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", bijInstallPrompt);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", bijInstallPrompt);
  }, []);

  function weg() {
    try {
      window.localStorage.setItem(SLEUTEL_WEG, "1");
    } catch {
      // niet erg
    }
    setTip(false);
  }

  if (!tip) return null;
  return (
    <div role="region" aria-label="Zet Kostenplan op je beginscherm" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-xl border border-border bg-card p-4 shadow-lg md:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">Zet Kostenplan op je beginscherm</p>
          <p className="text-sm text-muted-foreground">Dan open je je aanvragen met één tik, zoals een app.</p>
          {uitleg && (
            <p className="mt-2 text-sm text-foreground">
              {isIos()
                ? "Tik onderin op Delen en kies Zet op beginscherm."
                : "Tik rechtsboven in je browser op ⋮ en kies Toevoegen aan startscherm."}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                if (installEvent) {
                  await installEvent.prompt();
                  weg();
                } else setUitleg(true);
              }}
            >
              {installEvent ? "Toevoegen" : "Hoe doe ik dat?"}
            </Button>
          </div>
        </div>
        <button type="button" onClick={weg} aria-label="Tip sluiten" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
