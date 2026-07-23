// Handmatig testscript voor de auto-branding-extractie — roept de
// extractie-pipeline rechtstreeks aan (niet via de HTTP-route, die
// authenticatie + een Plus/Pro-abonnement vereist) tegen een paar echte
// site-typen, en logt per URL welke bron elk veld opleverde.
//
// Logo-upload vereist een echte Supabase Storage-verbinding (DATABASE_URL/
// NEXT_PUBLIC_SUPABASE_URL in .env.local) — zonder die config faalt alleen
// de upload-stap (resolveLogo() vangt dat per kandidaat af), de rest van de
// extractie loopt gewoon door.
//
// Gebruik:
//   npm run test:branding-extract
//   npm run test:branding-extract -- https://een-andere-site.nl
import { extractBranding } from "../app/lib/branding-extract";

const DEFAULT_URLS = [
  // WordPress (zeer gangbaar bij vakmensen-sites)
  "https://wordpress.org",
  // Wix
  "https://www.wix.com",
  // Squarespace
  "https://www.squarespace.com",
];

// Geen echt bedrijf nodig om de extractielogica te testen — alleen de
// logo-upload-stap gebruikt dit id (als pad-prefix in Supabase Storage).
const TEST_COMPANY_ID = "test-script";

const urls = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_URLS;

function summarize(result: Awaited<ReturnType<typeof extractBranding>>) {
  if (!result.success) {
    console.log(`  mislukt: ${result.error}`);
    return;
  }
  console.log(`  primaire kleur   : ${result.primaryColor}  (bron: ${result.source}, confidence: ${result.confidence})`);
  console.log(`  secundaire kleur : ${result.secondaryColor ?? "(niet gevonden — veld weggelaten)"}`);
  console.log(`  lettertype       : ${result.lettertype}${result.fontFamily ? `  (gevonden: ${result.fontFamily})` : "  (fallback, geen webfont gevonden)"}`);
  console.log(`  logo             : ${result.logoUrl ?? "(niet gevonden)"}`);
  console.log(`  bedrijfsnaam     : ${result.companyName ?? "(niet gevonden)"}`);
  console.log(`  titel            : ${result.title}`);
  console.log(`  titel (alt.)     : ${result.titleAlternative ?? "(geen bruikbare hero-tekst)"}`);
  console.log(`  subtitel         : ${result.subtitle}`);
}

async function main() {
  for (const url of urls) {
    console.log(`\n=== ${url} ===`);
    const start = Date.now();
    try {
      const result = await extractBranding(url, TEST_COMPANY_ID);
      const ms = Date.now() - start;
      summarize(result);
      console.log(`  (${ms}ms)`);
      console.log(`  ruw: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error("Onverwachte fout (zou nooit mogen gebeuren — extractBranding vangt zelf af):", error);
    }
  }
}

main();
