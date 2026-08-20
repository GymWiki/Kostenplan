import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Material-/extra-optie foto's zijn max 5MB (zie app/lib/storage.ts);
      // laat ruimte voor multipart-overhead boven op de bestandsgrootte.
      bodySizeLimit: "6mb",
    },
    // Client Router Cache: hergebruik een net bezochte dynamische route tot
    // 120s zonder nieuwe server-round-trip (auth-check + queries) — merkbaar
    // bij heen-en-weer navigeren tussen dashboardpagina's. Een Server Action
    // die revalidatePath aanroept (bijv. een leadstatus wijzigen) forceert
    // zelf alsnog een verse fetch van die specifieke route.
    staleTimes: {
      dynamic: 120,
    },
  },
  async headers() {
    return [
      {
        source: "/portaal/:slug*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *;" }],
      },
      // Canonieke publieke tool-URL (/t/[bedrijfsslug]/[toolslug]) en het
      // toegespitste embed-endpoint (/embed/[toolId]) — beide moeten net als
      // de legacy /portaal/:slug* insluitbaar zijn in een iframe op een
      // willekeurige website van de klant.
      {
        source: "/t/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *;" }],
      },
      {
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *;" }],
      },
    ];
  },
};

export default nextConfig;
