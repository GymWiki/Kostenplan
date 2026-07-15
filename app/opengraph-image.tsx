import { ImageResponse } from "next/og";

// Standaard OG/Twitter-afbeelding voor de hele site — elke route zonder
// eigen, specifiekere opengraph-image.tsx erft deze (Next.js' bestands-
// conventie werkt hiërarchisch, net als favicons). Dynamisch gegenereerd in
// plaats van een los PNG-bestand, zodat de tekst hier meebeweegt als de
// merknaam of pay-off ooit wijzigt.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#15803d",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 88,
              height: 88,
              borderRadius: 20,
              background: "rgba(255,255,255,0.15)",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -1 }}>
            Kostenplan
          </div>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "rgba(255,255,255,0.9)" }}>
          Offertecalculator voor hoveniers en vakmensen
        </div>
      </div>
    ),
    size
  );
}
