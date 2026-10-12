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
    // Hoogte zonder toetsenbord: de grootste hoogte die we bij deze breedte
    // zagen. Zo herkennen we het toetsenbord zowel als de visuele viewport
    // krimpt (iOS, nieuwe Android) als wanneer de hele pagina krimpt (oudere Android).
    let basis = window.innerHeight;
    let breedte = window.innerWidth;
    function bepaal() {
      if (window.innerWidth !== breedte) {
        breedte = window.innerWidth;
        basis = window.innerHeight;
      }
      const hoogte = vv ? vv.height : window.innerHeight;
      basis = Math.max(basis, window.innerHeight);
      const kleiner = basis - hoogte > 140;
      const el = document.activeElement;
      const opVeld =
        el instanceof HTMLElement &&
        (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "range"].includes((el as HTMLInputElement).type)));
      setOpen(kleiner || Boolean(opVeld && window.matchMedia(QUERY).matches && kleiner));
    }
    vv?.addEventListener("resize", bepaal);
    window.addEventListener("resize", bepaal);
    document.addEventListener("focusin", bepaal);
    document.addEventListener("focusout", () => setTimeout(bepaal, 50));
    bepaal();
    return () => {
      vv?.removeEventListener("resize", bepaal);
      window.removeEventListener("resize", bepaal);
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
