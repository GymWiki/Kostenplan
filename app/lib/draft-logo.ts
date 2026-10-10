export const MAX_LOGO_BYTES = 200 * 1024;

export type LogoUitDataUrl = { bytes: Buffer; mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

// Controleert een logo uit het browser-concept: alleen png, jpg of webp, echt
// van dat type (magic bytes, niet alleen de naam) en maximaal 200 KB.
// Geeft null bij alles wat daar niet aan voldoet; het logo wordt dan weggelaten.
export function logoUitDataUrl(dataUrl: string): LogoUitDataUrl | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_LOGO_BYTES) return null;
  const mime = m[1] as LogoUitDataUrl["mime"];
  const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "image/png" && isPng) return { bytes, mime, ext: "png" };
  if (mime === "image/jpeg" && isJpeg) return { bytes, mime, ext: "jpg" };
  if (mime === "image/webp" && isWebp) return { bytes, mime, ext: "webp" };
  return null;
}
