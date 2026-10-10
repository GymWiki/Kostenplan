import { NextResponse, type NextRequest } from "next/server";
import { brandingExtractSchema } from "@/app/lib/validation";
import { extractBranding } from "@/app/lib/branding-extract";

export const dynamic = "force-dynamic";

// Publiek endpoint zonder login voor /probeer: haalt logo en kleuren van een
// website, zodat een hovenier zijn voorbeeld al in zijn eigen huisstijl ziet.
// Er wordt niets opgeslagen en niets geüpload: het logo gaat als data-URL terug
// naar de browser. Beveiliging zit in extractBranding(): alleen http(s), geen
// localhost/privé/link-local adressen (ook niet na DNS of redirects), maximaal
// 3 redirects, 5 s per verzoek, 12 s totaal, begrensde groottes, geen cookies
// doorgegeven en alleen HTML/CSS/afbeeldingen. Een rate limit zit bewust niet in
// de code, maar als Vercel Firewall-regel (zie docs/DRAFT-FLOW.md).
//
// Nooit een foutpagina: elke mislukking is een nette 200 met success:false en
// een vaste, nietszeggende tekst (geen details over interne adressen).
const MISLUKT = { success: false, error: "We konden je logo niet ophalen. Je kunt het zelf toevoegen.", confidence: "low" } as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    const tekst = await request.text();
    if (tekst.length > 4096) return NextResponse.json(MISLUKT, { status: 413 });
    body = JSON.parse(tekst);
  } catch {
    return NextResponse.json(MISLUKT, { status: 400 });
  }
  const parsed = brandingExtractSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(MISLUKT, { status: 400 });

  try {
    const resultaat = await extractBranding(parsed.data.url, null);
    if (!resultaat.success) return NextResponse.json(MISLUKT);
    // Alleen wat de browser nodig heeft.
    return NextResponse.json({
      success: true,
      primaryColor: resultaat.primaryColor,
      lettertype: resultaat.lettertype,
      logoDataUrl: resultaat.logoDataUrl ?? null,
      companyName: resultaat.companyName,
      title: resultaat.title,
      subtitle: resultaat.subtitle,
    });
  } catch {
    return NextResponse.json(MISLUKT);
  }
}
