// Kleurwiskunde voor zowel de handmatige branding-form (contrastwaarschuwing
// tegen wit) als de auto-branding-extractie (grijstintfilter, WCAG-correctie,
// accent-vs-primary-verschil). Puur functioneel, geen DOM/browser-API's, dus
// bruikbaar in zowel server (API-route) als client (form) code.

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

export function hexToRgb(hex: string): Rgb | null {
  const match = HEX_RE.exec(hex);
  if (!match) return null;
  const num = parseInt(match[1], 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hueToRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const hn = h / 360;
  return {
    r: hueToRgb(hn + 1 / 3) * 255,
    g: hueToRgb(hn) * 255,
    b: hueToRgb(hn - 1 / 3) * 255,
  };
}

export function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

// Relatieve luminantie per WCAG 2.x (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
function relativeLuminance({ r, g, b }: Rgb): number {
  const [rn, gn, bn] = [r, g, b].map((c) => {
    const cn = c / 255;
    return cn <= 0.03928 ? cn / 12.92 : ((cn + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
}

// Contrastratio tussen twee kleuren per WCAG 2.x, 1 (geen contrast) tot 21
// (zwart-op-wit). Gebruikt door zowel de handmatige contrastwaarschuwing in
// branding-form.tsx (tegen wit) als de auto-darken-stap in de extractie.
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastAgainstWhite(hex: string): number | null {
  return contrastRatio(hex, "#ffffff");
}

// HSL-saturatie/lightness-drempels om wit, zwart en grijstinten uit te
// filteren als "geen echte merkkleur" — een foto- of achtergrondgrijs telt
// hierdoor niet mee als gedetecteerde brandkleur.
export function isGrayscale(hex: string): boolean {
  const hsl = hexToHsl(hex);
  if (!hsl) return true;
  return hsl.s < 15 || hsl.l < 8 || hsl.l > 95;
}

// Maakt een kleur donkerder in stappen van 5% lightness totdat wit erop
// minstens WCAG AA (4.5:1) haalt, of tot de kleur te ver van het origineel
// afwijkt om nog zinvol te zijn (max 12 stappen = 60% lightness-verlies).
// Geeft de aangepaste kleur terug, of null als zelfs dat niet volstaat —
// de aanroeper valt dan terug op een donkere textOnPrimary in plaats van
// wit.
export function darkenUntilContrast(
  hex: string,
  targetRatio = 4.5,
  maxSteps = 12
): { hex: string; ratio: number } | null {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;

  let current = hsl;
  for (let step = 0; step <= maxSteps; step++) {
    const candidateHex = rgbToHex(hslToRgb(current));
    const ratio = contrastAgainstWhite(candidateHex);
    if (ratio !== null && ratio >= targetRatio) {
      return { hex: candidateHex, ratio };
    }
    current = { ...current, l: Math.max(0, current.l - 5) };
  }
  return null;
}

// Hoe duidelijk twee kleuren van elkaar verschillen — gebruikt om een
// gedetecteerde "accent"-kleur te verwerpen als die te dicht bij de primary
// ligt om als los, herkenbaar accent te dienen.
export function colorsAreDistinct(hexA: string, hexB: string): boolean {
  const hslA = hexToHsl(hexA);
  const hslB = hexToHsl(hexB);
  if (!hslA || !hslB) return false;

  let hueDelta = Math.abs(hslA.h - hslB.h);
  if (hueDelta > 180) hueDelta = 360 - hueDelta;

  const lightnessDelta = Math.abs(hslA.l - hslB.l);
  return hueDelta > 30 || lightnessDelta > 25;
}
