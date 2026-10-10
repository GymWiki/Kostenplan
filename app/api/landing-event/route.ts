import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  bron: z.enum(["hero", "afsluiter", "prijzen", "nav", "werkzaamheden"]),
  actie: z.enum(["cta", "website-invoer", "pakket-kiezen"]),
  pakket: z.enum(["GRATIS", "PLUS", "PRO"]).optional(),
  metSite: z.boolean().optional(),
});

// Neemt klikmetingen van de landingspagina aan en logt ze als één JSON-regel.
// Geen cookies, geen IP, geen opslag.
export async function POST(request: NextRequest) {
  try {
    const tekst = await request.text();
    if (tekst.length > 512) return new NextResponse(null, { status: 413 });
    const p = schema.safeParse(JSON.parse(tekst));
    if (!p.success) return new NextResponse(null, { status: 400 });
    console.info(JSON.stringify({ event: "landing_klik", ...p.data }));
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
