// Verkleint een logo in de browser tot maximaal 256 px en ±100 KB en geeft een
// data-URL terug. Alleen aanroepen in de browser (gebruikt canvas).
export const LOGO_MAX_PX = 256;
export const LOGO_MAX_BYTES = 100 * 1024;
const TOEGESTAAN = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export type LogoUitkomst = { ok: true; dataUrl: string } | { ok: false; error: string };

export function berekenAfmeting(w: number, h: number, max = LOGO_MAX_PX): { w: number; h: number } {
  const schaal = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * schaal)), h: Math.max(1, Math.round(h * schaal)) };
}

function laadAfbeelding(bron: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bron);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("onleesbaar"));
    };
    img.src = url;
  });
}

const bytesVan = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

export async function verkleinLogo(bestand: Blob): Promise<LogoUitkomst> {
  if (!TOEGESTAAN.includes(bestand.type)) return { ok: false, error: "Kies een logo als png, jpg, webp of svg." };
  if (bestand.size > 10 * 1024 * 1024) return { ok: false, error: "Dit bestand is te groot. Kies een kleiner logo." };
  try {
    const img = await laadAfbeelding(bestand);
    const { w, h } = berekenAfmeting(img.naturalWidth || LOGO_MAX_PX, img.naturalHeight || LOGO_MAX_PX);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "Het logo kon niet worden verkleind." };
    ctx.drawImage(img, 0, 0, w, h);
    // png houdt transparantie; blijft het te groot, dan webp met afnemende kwaliteit.
    let dataUrl = canvas.toDataURL("image/png");
    for (const q of [0.9, 0.75, 0.6, 0.4]) {
      if (bytesVan(dataUrl) <= LOGO_MAX_BYTES) break;
      dataUrl = canvas.toDataURL("image/webp", q);
    }
    if (!dataUrl.startsWith("data:image/") || bytesVan(dataUrl) > LOGO_MAX_BYTES) {
      return { ok: false, error: "Dit logo is te gedetailleerd. Kies een eenvoudiger bestand." };
    }
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "Dit bestand kon niet worden gelezen als afbeelding." };
  }
}
