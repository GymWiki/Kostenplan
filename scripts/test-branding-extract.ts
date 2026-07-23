// Handmatig testscript voor de auto-branding-extractie — roept de
// extractie-pipeline rechtstreeks aan (niet via de HTTP-route, die
// authenticatie + een Plus/Pro-abonnement vereist) tegen een paar echte
// site-typen, en logt het resultaat.
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

const urls = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_URLS;

async function main() {
  for (const url of urls) {
    console.log(`\n=== ${url} ===`);
    const start = Date.now();
    try {
      const result = await extractBranding(url);
      const ms = Date.now() - start;
      console.log(JSON.stringify(result, null, 2));
      console.log(`(${ms}ms)`);
    } catch (error) {
      console.error("Onverwachte fout (zou nooit mogen gebeuren — extractBranding vangt zelf af):", error);
    }
  }
}

main();
