"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptBelofte: Promise<void> | null = null;

function laadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptBelofte ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile laden mislukt"));
    document.head.appendChild(s);
  });
  return scriptBelofte;
}

// Onzichtbare Cloudflare Turnstile-controle ("interaction-only": je ziet alleen
// iets als Cloudflare toch een vinkje wil). Zet het token in een verborgen
// veld "captchaToken" in het omliggende formulier. Zonder
// NEXT_PUBLIC_TURNSTILE_SITE_KEY doet dit niets, zodat bestaande formulieren
// blijven werken tot de controle bewust wordt aangezet.
export function TurnstileVeld({ onKlaar }: { onKlaar?: (klaar: boolean) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const doel = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");
  const widgetId = useRef<string | null>(null);
  const klaarRef = useRef(onKlaar);
  useEffect(() => {
    klaarRef.current = onKlaar;
  });

  useEffect(() => {
    if (!siteKey) {
      klaarRef.current?.(true);
      return;
    }
    klaarRef.current?.(false);
    let weg = false;
    laadScript()
      .then(() => {
        if (weg || !doel.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(doel.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          callback: (t: string) => {
            setToken(t);
            klaarRef.current?.(true);
          },
          "expired-callback": () => {
            setToken("");
            klaarRef.current?.(false);
          },
          "error-callback": () => {
            setToken("");
          },
        });
      })
      .catch(() => {});

    // Een token is eenmalig: na verzenden een nieuw ophalen.
    const form = doel.current?.closest("form");
    const naVerzenden = () => {
      window.setTimeout(() => {
        if (widgetId.current && window.turnstile) {
          setToken("");
          klaarRef.current?.(false);
          window.turnstile.reset(widgetId.current);
        }
      }, 300);
    };
    form?.addEventListener("submit", naVerzenden);
    return () => {
      weg = true;
      form?.removeEventListener("submit", naVerzenden);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <>
      <div ref={doel} />
      <input type="hidden" name="captchaToken" value={token} />
    </>
  );
}
