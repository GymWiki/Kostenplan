import { NextResponse, type NextRequest } from "next/server";
import { ruimGastenOp } from "@/app/lib/gast-opruimen";
import { echteOpruimAfhankelijkheden } from "@/app/lib/gast-opruimen-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dagelijkse Vercel-cron: verwijdert gast-voorbeelden ouder dan 7 dagen
// (bedrijf, rekentool, onderdelen, huisstijl, logo's in Storage en de anonieme
// gebruiker). Vercel stuurt automatisch "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }
  try {
    const r = await ruimGastenOp(echteOpruimAfhankelijkheden());
    console.log(`Gast-opruiming: ${r.gasten} gasten, ${r.bedrijven} bedrijven, ${r.bestanden} bestanden verwijderd, ${r.fouten.length} fouten`);
    if (r.fouten.length > 0) console.error("Gast-opruiming fouten:", r.fouten);
    return NextResponse.json(r, { status: r.fouten.length > 0 ? 207 : 200 });
  } catch (error) {
    console.error("Gast-opruiming mislukt", error);
    return NextResponse.json({ error: "Opruimen mislukt" }, { status: 500 });
  }
}
