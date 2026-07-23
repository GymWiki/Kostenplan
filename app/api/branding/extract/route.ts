import { NextResponse, type NextRequest } from "next/server";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, isBetaaldTier } from "@/app/lib/subscription";
import { brandingExtractSchema } from "@/app/lib/validation";
import { extractBranding } from "@/app/lib/branding-extract";

export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 10;

// Nooit een 500 op verwachte foutpaden (ongeldige URL, time-out, 403, intern
// IP, tier-limiet) — die komen als nette JSON terug, ook als de HTTP-status
// niet 200 is. Alleen de auth-check zelf kan een "harde" 401 geven.
export async function POST(request: NextRequest) {
  const { user, company } = await requireActiveCompany();

  // Kleuren/lettertype zijn een Plus/Pro-feature (zie updateBrandingAction)
  // — de extractie zelf kost ons externe fetches + beeldverwerking, dus die
  // poort hier al dicht i.p.v. Gratis-gebruikers te laten proberen en dan
  // pas bij het opslaan tegen de muur te laten lopen.
  if (!isBetaaldTier(effectiveTier(company))) {
    return NextResponse.json(
      { success: false, error: "Automatische huisstijl is een Plus/Pro-feature.", confidence: "low" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldig verzoek.", confidence: "low" },
      { status: 400 }
    );
  }

  const parsed = brandingExtractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Vul een geldige website-URL in.", confidence: "low" },
      { status: 400 }
    );
  }
  const { url } = parsed.data;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentAttempts = await prisma.brandingExtractionAttempt.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recentAttempts >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      {
        success: false,
        error: "Je hebt de limiet van 10 automatische huisstijl-checks per uur bereikt. Probeer het straks opnieuw.",
        confidence: "low",
      },
      { status: 429 }
    );
  }

  let result: Awaited<ReturnType<typeof extractBranding>>;
  try {
    result = await extractBranding(url, company.id);
  } catch (error) {
    // Laatste vangnet — extractBranding() zelf vangt al elke verwachte
    // faalroute af, maar iets onvoorziens mag hier nooit als 500 naar
    // buiten lekken.
    console.error("Branding-extractie: onverwachte fout", error);
    result = { success: false, error: "Er ging iets mis bij het analyseren van de website.", confidence: "low" };
  }

  await prisma.brandingExtractionAttempt.create({
    data: { userId: user.id, sourceUrl: url, success: result.success },
  });

  return NextResponse.json(result);
}
