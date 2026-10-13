"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { cn } from "@/app/lib/cn";

// Kaartvoorbeeld met de gratis PDOK-achtergrondkaart (BRT, Kadaster). Toont het vestigingsadres met een cirkel
// van de straal, de gemarkeerde postcodegebieden en/of het adres van een klant. Alleen in de browser.
export const PDOK_TEGELS = "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";

export type KaartPunt = { lat: number; lon: number; label?: string };

export function WerkgebiedKaart({
  start,
  straalKm,
  postcodes = [],
  klant,
  hoogte = 280,
  ariaLabel,
  className,
}: {
  start?: KaartPunt | null;
  straalKm?: number | null;
  postcodes?: KaartPunt[];
  klant?: KaartPunt | null;
  hoogte?: number;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // De ouder maakt bij elke render nieuwe objecten; alleen een echte wijziging bouwt de kaart opnieuw op.
  const sleutel = JSON.stringify({ start, straalKm, postcodes, klant });

  useEffect(() => {
    const { start, straalKm, postcodes = [], klant } = JSON.parse(sleutel) as { start?: KaartPunt | null; straalKm?: number | null; postcodes?: KaartPunt[]; klant?: KaartPunt | null };
    let weg = false;
    let kaart: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (weg || !ref.current) return;
      kaart = L.map(ref.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer(PDOK_TEGELS, { minZoom: 6, maxZoom: 19, attribution: "Kaartgegevens © Kadaster" }).addTo(kaart);
      const groep: import("leaflet").LatLngExpression[] = [];
      const kleur = "#15803d";
      if (start) {
        const p: [number, number] = [start.lat, start.lon];
        groep.push(p);
        L.circleMarker(p, { radius: 7, color: "#ffffff", weight: 2, fillColor: kleur, fillOpacity: 1 }).bindTooltip(start.label ?? "Je vestigingsadres").addTo(kaart);
        if (straalKm && straalKm > 0) {
          const c = L.circle(p, { radius: straalKm * 1000, color: kleur, weight: 2, fillColor: kleur, fillOpacity: 0.12 }).addTo(kaart);
          const b = c.getBounds();
          groep.push(b.getNorthEast(), b.getSouthWest());
        }
      }
      for (const pc of postcodes) {
        const p: [number, number] = [pc.lat, pc.lon];
        groep.push(p);
        L.circleMarker(p, { radius: 9, color: kleur, weight: 2, fillColor: kleur, fillOpacity: 0.35 }).bindTooltip(pc.label ?? "", { permanent: postcodes.length <= 12, direction: "top" }).addTo(kaart);
      }
      if (klant) {
        const p: [number, number] = [klant.lat, klant.lon];
        groep.push(p);
        L.circleMarker(p, { radius: 7, color: "#ffffff", weight: 2, fillColor: "#b45309", fillOpacity: 1 }).bindTooltip(klant.label ?? "Klant", { permanent: true, direction: "top" }).addTo(kaart);
        if (start) L.polyline([[start.lat, start.lon], p], { color: "#b45309", weight: 2, dashArray: "6 6" }).addTo(kaart);
      }
      if (groep.length > 1) kaart.fitBounds(L.latLngBounds(groep), { padding: [24, 24], maxZoom: 13 });
      else if (groep.length === 1) kaart.setView(groep[0], 11);
      else kaart.setView([52.2, 5.3], 7); // Nederland
    })();
    return () => {
      weg = true;
      kaart?.remove();
    };
  }, [sleutel]);

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height: hoogte }} className={cn("z-0 w-full overflow-hidden rounded-xl border border-border bg-muted", className)} />;
}
