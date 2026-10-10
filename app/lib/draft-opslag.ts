import { DRAFT_SLEUTEL, draftSchema, isVerlopen, type Draft } from "@/app/lib/draft";

// Opslag van het concept in de browser (localStorage), met geheugen als
// vangnet: een privévenster of geblokkeerde opslag mag nooit iets breken.
// De opslag is injecteerbaar zodat dit zonder browser te testen is.
export type OpslagLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type OpslagStatus =
  | { soort: "ok" }
  | { soort: "geheugen" } // opslag geblokkeerd: concept leeft alleen in dit tabblad
  | { soort: "logo-weggelaten" }; // te groot voor de opslag: zonder logo bewaard

export type Lezing = { draft: Draft | null; opslag: "ok" | "geheugen" };

export function maakDraftOpslag(haalOpslag: () => OpslagLike | null, nu: () => number = Date.now) {
  let geheugen: Draft | null = null;
  let geblokkeerd = false;

  const opslag = (): OpslagLike | null => {
    if (geblokkeerd) return null;
    try {
      const o = haalOpslag();
      if (!o) geblokkeerd = true;
      return o;
    } catch {
      geblokkeerd = true;
      return null;
    }
  };

  function lees(): Lezing {
    const o = opslag();
    if (!o) return { draft: geheugen && !isVerlopen(geheugen, nu()) ? geheugen : null, opslag: "geheugen" };
    try {
      const ruw = o.getItem(DRAFT_SLEUTEL);
      if (!ruw) return { draft: geheugen, opslag: "ok" };
      const geparsed = draftSchema.safeParse(JSON.parse(ruw));
      if (!geparsed.success || isVerlopen(geparsed.data, nu())) {
        wis();
        return { draft: null, opslag: "ok" };
      }
      return { draft: geparsed.data, opslag: "ok" };
    } catch {
      // Kapotte JSON of een leesfout: schoon beginnen.
      wis();
      return { draft: null, opslag: geblokkeerd ? "geheugen" : "ok" };
    }
  }

  function schrijf(draft: Draft): OpslagStatus {
    const bewaard = { ...draft, updatedAt: nu() };
    geheugen = bewaard;
    const o = opslag();
    if (!o) return { soort: "geheugen" };
    try {
      o.setItem(DRAFT_SLEUTEL, JSON.stringify(bewaard));
      return { soort: "ok" };
    } catch {
      // Quotum vol: probeer zonder logo.
      if (bewaard.company.logoDataUrl) {
        const zonderLogo = { ...bewaard, company: { ...bewaard.company, logoDataUrl: undefined } };
        try {
          o.setItem(DRAFT_SLEUTEL, JSON.stringify(zonderLogo));
          geheugen = zonderLogo;
          return { soort: "logo-weggelaten" };
        } catch {
          /* val door */
        }
      }
      geblokkeerd = true;
      return { soort: "geheugen" };
    }
  }

  function wis() {
    geheugen = null;
    try {
      opslag()?.removeItem(DRAFT_SLEUTEL);
    } catch {
      /* negeren */
    }
  }

  return { lees, schrijf, wis, isGeblokkeerd: () => geblokkeerd };
}

export type DraftOpslag = ReturnType<typeof maakDraftOpslag>;

// De echte opslag in de browser.
let browserOpslag: DraftOpslag | null = null;
export function draftOpslag(): DraftOpslag {
  browserOpslag ??= maakDraftOpslag(() => (typeof window === "undefined" ? null : window.localStorage));
  return browserOpslag;
}

// Gedebounced schrijven (±400 ms): de laatste waarde wint.
export function maakGedebounced(opslag: DraftOpslag, vertraging = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let laatste: Draft | null = null;
  let onStatus: ((s: OpslagStatus) => void) | undefined;
  const nu = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (laatste) {
      const s = opslag.schrijf(laatste);
      laatste = null;
      onStatus?.(s);
    }
  };
  return {
    plan(draft: Draft, naStatus?: (s: OpslagStatus) => void) {
      laatste = draft;
      onStatus = naStatus;
      if (timer) clearTimeout(timer);
      timer = setTimeout(nu, vertraging);
    },
    nu,
  };
}
