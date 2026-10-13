// Afstand hemelsbreed (haversine) tussen twee punten, in kilometers. Geen wegen of reistijd.
export type Punt = { lat: number; lon: number };

const AARDE_KM = 6371.0088;
const rad = (g: number) => (g * Math.PI) / 180;

export function afstandKm(a: Punt, b: Punt): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * AARDE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Afstand op een tiende kilometer, zoals getoond en gerekend.
export const rondKm = (km: number) => Math.round(km * 10) / 10;
