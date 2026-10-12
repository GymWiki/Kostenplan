// De ene afrondingsregel van de rekenkern: een bedrag in centen wordt per regel op hele centen
// afgerond, half omhoog. Eerst wordt floating-point-ruis weggehaald (2,4999999999 telt als 2,5),
// zodat dezelfde invoer altijd op dezelfde uitkomst uitkomt.
export function rondCenten(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.round(Math.round(x * 1e6) / 1e6);
}

// Naar boven afronden zonder dat ruis (2,0000000001) een hele stap extra oplevert.
export function ceilStap(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.ceil(Math.round(x * 1e6) / 1e6);
}

// Bovengrens voor invoer. Daarboven is het geen aanvraag meer maar een typefout; de kern
// rekent dan met de grens en geeft een waarschuwing.
export const MAX_HOEVEELHEID = 1_000_000;
export const MAX_BEDRAG_CENTEN = 100_000_000_00; // € 100 miljoen per regel

export type SchoonGetal = { waarde: number; probleem: "ongeldig" | "negatief" | "te-groot" | null };

// Maakt van willekeurige invoer een veilig, niet-negatief eindig getal.
export function schoonGetal(x: unknown, max = MAX_HOEVEELHEID): SchoonGetal {
  if (typeof x !== "number" || Number.isNaN(x)) return { waarde: 0, probleem: x === undefined || x === null ? null : "ongeldig" };
  if (!Number.isFinite(x)) return { waarde: x > 0 ? max : 0, probleem: x > 0 ? "te-groot" : "ongeldig" };
  if (x < 0) return { waarde: 0, probleem: "negatief" };
  if (x > max) return { waarde: max, probleem: "te-groot" };
  return { waarde: x, probleem: null };
}
