import { BEDRIJF, DEFINITIE, LAATST_BIJGEWERKT, PAKKETTEN, SITE_URL, WEBSITEBOUWERS, eur } from "@/app/lib/landing/feiten";
import { PLAN_LIMITS } from "@/app/lib/subscription";

export const dynamic = "force-static";

// /llms.txt: korte, feitelijke beschrijving voor AI-systemen (llmstxt.org).
export function GET() {
  const tekst = `# Kostenplan

> ${DEFINITIE}

Laatst bijgewerkt: ${LAATST_BIJGEWERKT.tekst}. Taal: Nederlands. Doelgroep: hoveniers (ondernemers), niet particulieren.

## Wat het is
- Een hovenier bouwt een rekentool met zijn eigen werkzaamheden (schutting, bestrating en terras, graszoden, kunstgras, vlonder, haag, grondwerk en afvoer, bomen), materiaalprijzen, werktempo en dagdeeltarief.
- Zijn klanten berekenen op zijn website zelf de prijs en sturen een aanvraag; de hovenier past een conceptofferte aan en verstuurt die.
- Logo en kleuren kunnen automatisch van de website van de hovenier worden gehaald.
- Starten kan gratis en zonder account op ${SITE_URL}/probeer.
- Werkt met elke website; de rekentool kan ingesloten worden (Pro) of via een link gedeeld worden. Uitleg voor ${WEBSITEBOUWERS.join(", ")}.

## Prijzen (EUR)
${PAKKETTEN.map((p) => (p.maand === 0 ? `- Gratis: ${eur(0)}. Tot ${PLAN_LIMITS.GRATIS.maxProductsPerCompany} werkzaamheden, ${PLAN_LIMITS.GRATIS.maxActiveTools} rekentool, delen via een link.` : `- ${p.naam}: ${eur(p.maand)} per maand of ${eur(p.jaar)} per jaar.`)).join("\n")}
- Eigen logo en kleuren en aanvragen/offertes: vanaf Plus. Insluiten in een eigen pagina: Pro.

## Belangrijkste pagina's
- [Home](${SITE_URL}/): wat Kostenplan is, demo, prijzen, veelgestelde vragen
- [Probeer gratis](${SITE_URL}/probeer): bouw een voorbeeld zonder account
- [Prijzen](${SITE_URL}/prijzen)
- [Rekentool voor hoveniers](${SITE_URL}/voor/hoveniers)
- [Rekentool op je eigen website](${SITE_URL}/rekentool-op-eigen-website)
- [Voorbeelden van rekentools](${SITE_URL}/voorbeelden-rekentools)
- [Online offerte maken](${SITE_URL}/online-offerte-maken)
- [Functionaliteiten](${SITE_URL}/features)
- [Kennisbank](${SITE_URL}/kennisbank)

## Bedrijf
Kostenplan is onderdeel van ${BEDRIJF.naam}, KVK ${BEDRIJF.kvk}, ${BEDRIJF.plaats}, Nederland. Contact: ${BEDRIJF.email}.
`;
  return new Response(tekst, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
