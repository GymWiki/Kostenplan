import { ImageResponse } from "next/og";
import { KOPREGEL } from "@/app/lib/landing/feiten";

// OG-afbeelding van de landingspagina: de kopregel, een prijs en een maatlijn.
// Geen foto's. Kleuren komen uit de landing-tokens (docs/landing-design.md).
export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3f4ee", color: "#13201a", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#46534b" }}>Kostenplan · rekentool voor hoveniers</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.02 }}>{KOPREGEL}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#46534b", fontSize: 22 }}>
            <div style={{ display: "flex", height: 2, width: 120, background: "#46534b" }} />
            kostenplan.nl
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 330, border: "3px solid #13201a", background: "#fbfbf8" }}>
            <div style={{ display: "flex", background: "#1a4a35", color: "#fff", padding: "18px 22px", fontSize: 26, fontWeight: 700 }}>Bestrating · 20 m²</div>
            <div style={{ display: "flex", flexDirection: "column", padding: 22, gap: 6, color: "#46534b", fontSize: 24 }}>
              <div style={{ display: "flex" }}>Materiaal</div>
              <div style={{ display: "flex" }}>Arbeid</div>
              <div style={{ display: "flex" }}>Voorrijkosten</div>
            </div>
            <div style={{ display: "flex", background: "#c8962f", padding: "18px 22px", fontSize: 40, fontWeight: 800 }}>Jouw prijs</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
