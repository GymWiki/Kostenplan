// Eén gedeelde, geteste parser voor bedragen en hoeveelheden die iemand in een
// veld typt (nl-NL). Geeft nooit stilzwijgend 0 of een verkeerde waarde terug:
// ongeldige invoer levert een Nederlandse melding op.
//
// Regels:
// - komma = decimaalteken; punt = duizendtal óf decimaalteken:
//   · precies één punt met 1–2 cijfers erna → decimaal ("12.50" = 12,50)
//   · punt met precies 3 cijfers erna (of meerdere punten) → duizendtal ("1.250" = 1250)
//   · punt én komma → het laatste teken is het decimaalteken ("1.250,50", "1,250.50")
// - € en spaties (ook niet-brekende) worden genegeerd.

export type GetalResultaat = { ok: true; waarde: number } | { ok: false; fout: string };
export type BedragResultaat = { ok: true; centen: number } | { ok: false; fout: string };

export type GetalOpties = {
  /** Mag de waarde negatief zijn? Standaard niet. */
  negatief?: boolean;
  min?: number;
  max?: number;
  /** Voor de melding: "bedrag" (standaard) of "aantal". */
  soort?: "bedrag" | "aantal" | "getal";
};

const ONGELDIG: Record<NonNullable<GetalOpties["soort"]>, string> = {
  bedrag: "Vul een geldig bedrag in, bijvoorbeeld 12,50.",
  aantal: "Vul een geldig aantal in, bijvoorbeeld 12,5.",
  getal: "Vul een geldig getal in, bijvoorbeeld 12,5.",
};

function fout(opties: GetalOpties | undefined): { ok: false; fout: string } {
  return { ok: false, fout: ONGELDIG[opties?.soort ?? "bedrag"] };
}

/** Zet getypte tekst om naar een getal, of geeft een Nederlandse melding. */
export function parseGetal(tekst: string, opties?: GetalOpties): GetalResultaat {
  const soort = opties?.soort ?? "bedrag";
  let t = tekst.replace(/[\s  ]/g, "").replace(/€/g, "");
  if (t === "") return { ok: false, fout: soort === "bedrag" ? "Vul een bedrag in." : "Vul een getal in." };

  let negatief = false;
  if (t.startsWith("-") || t.startsWith("−")) {
    negatief = true;
    t = t.slice(1);
  }
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return fout(opties);

  const punten = (t.match(/\./g) ?? []).length;
  const komma = (t.match(/,/g) ?? []).length;
  let geheel: string;
  let decimaal = "";

  if (komma > 1 && punten === 0) return fout(opties);
  if (komma >= 1 && punten >= 1) {
    const lastComma = t.lastIndexOf(",");
    const lastDot = t.lastIndexOf(".");
    const decTeken = lastComma > lastDot ? "," : ".";
    const duizendTeken = decTeken === "," ? "." : ",";
    if ((t.match(decTeken === "," ? /,/g : /\./g) ?? []).length !== 1) return fout(opties);
    const [g, d] = t.split(decTeken);
    if (!duizendtallenKloppen(g!, duizendTeken)) return fout(opties);
    geheel = g!.split(duizendTeken).join("");
    decimaal = d!;
  } else if (komma === 1) {
    [geheel, decimaal] = t.split(",") as [string, string];
  } else if (punten === 1) {
    const [g, d] = t.split(".") as [string, string];
    const nulVoorop = g === "0" || g === "";
    if (d.length === 3 && !nulVoorop) {
      geheel = g + d; // duizendtal
    } else {
      geheel = g;
      decimaal = d;
    }
  } else if (punten > 1) {
    if (!duizendtallenKloppen(t, ".")) return fout(opties);
    geheel = t.split(".").join("");
  } else {
    geheel = t;
  }

  if (geheel === "") geheel = "0";
  if (!/^\d+$/.test(geheel) || !/^\d*$/.test(decimaal)) return fout(opties);
  let waarde = Number(`${geheel}${decimaal ? "." + decimaal : ""}`);
  if (!Number.isFinite(waarde)) return fout(opties);
  if (negatief) waarde = -waarde;

  if (waarde < 0 && !opties?.negatief) {
    return { ok: false, fout: soort === "bedrag" ? "Een bedrag onder nul kan hier niet." : "Een negatief getal kan hier niet." };
  }
  if (opties?.min != null && waarde < opties.min) return { ok: false, fout: `Vul minimaal ${formatGetal(opties.min)} in.` };
  if (opties?.max != null && waarde > opties.max) return { ok: false, fout: `Vul maximaal ${formatGetal(opties.max)} in.` };
  return { ok: true, waarde: waarde === 0 ? 0 : waarde };
}

function duizendtallenKloppen(s: string, teken: string): boolean {
  const delen = s.split(teken);
  if (delen.some((d) => !/^\d+$/.test(d))) return false;
  if (delen.length === 1) return true;
  return delen[0]!.length <= 3 && delen.slice(1).every((d) => d.length === 3);
}

/** Zoals parseGetal, in hele centen (afgerond op 2 decimalen). */
export function parseBedrag(tekst: string, opties?: Omit<GetalOpties, "soort"> & { minCenten?: number; maxCenten?: number }): BedragResultaat {
  const r = parseGetal(tekst, { ...opties, soort: "bedrag" });
  if (!r.ok) return r;
  const centen = Math.round(r.waarde * 100 + (r.waarde >= 0 ? 1e-9 : -1e-9));
  if (opties?.minCenten != null && centen < opties.minCenten) return { ok: false, fout: `Vul minimaal ${formatGetal(opties.minCenten / 100, 2)} in.` };
  if (opties?.maxCenten != null && centen > opties.maxCenten) return { ok: false, fout: `Vul maximaal ${formatGetal(opties.maxCenten / 100, 2)} in.` };
  return { ok: true, centen };
}

/** Getal voor in een invoerveld: altijd met komma, zonder duizendtalpunten. */
export function formatGetalInvoer(n: number, decimalen?: number): string {
  const s = decimalen == null ? String(n) : n.toFixed(decimalen);
  return s.replace(".", ",");
}

export function formatBedragInvoer(centen: number): string {
  return formatGetalInvoer(centen / 100, 2);
}

function formatGetal(n: number, decimalen?: number): string {
  return new Intl.NumberFormat("nl-NL", decimalen == null ? {} : { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen }).format(n);
}
