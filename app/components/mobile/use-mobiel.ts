"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// < 768 px, zelfde grens als Tailwind's `md`. Server en eerste render geven
// `false` (desktop) zodat de HTML overeenkomt; mobiele onderdelen verbergen
// zichzelf daarnaast via CSS (`md:hidden`), dus er is geen flits.
const QUERY = "(max-width: 767px)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

export function useIsMobiel(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

// Is het schermtoetsenbord open? Op mobiel krimpt de visuele viewport dan
// flink; daar leiden we het uit af (plus focus op een tekstveld als vangnet
// voor browsers die de viewport niet verkleinen).
export function useToetsenbordOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    function bepaal() {
      const kleiner = vv ? window.innerHeight - vv.height > 140 : false;
      const el = document.activeElement;
      const opVeld =
        el instanceof HTMLElement &&
        (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "range"].includes((el as HTMLInputElement).type)));
      setOpen(kleiner || Boolean(opVeld && window.matchMedia(QUERY).matches && kleiner));
    }
    vv?.addEventListener("resize", bepaal);
    document.addEventListener("focusin", bepaal);
    document.addEventListener("focusout", () => setTimeout(bepaal, 50));
    bepaal();
    return () => {
      vv?.removeEventListener("resize", bepaal);
      document.removeEventListener("focusin", bepaal);
    };
  }, []);
  return open;
}

// Scrolt het actieve veld boven het toetsenbord uit.
export function useActiefVeldZichtbaar() {
  useEffect(() => {
    function bijFocus(e: FocusEvent) {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (!window.matchMedia(QUERY).matches) return;
      // wachten tot het toetsenbord er is
      setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    }
    document.addEventListener("focusin", bijFocus);
    return () => document.removeEventListener("focusin", bijFocus);
  }, []);
}

const geenAbonnement = () => () => {};
// Doelelement voor portals (binnen het admin-thema), pas op de client beschikbaar.
export function usePortalDoel(selector = "[data-admin-theme], [data-lp]"): HTMLElement | null {
  return useSyncExternalStore(
    geenAbonnement,
    () => document.querySelector<HTMLElement>(selector) ?? document.body,
    () => null
  );
}
