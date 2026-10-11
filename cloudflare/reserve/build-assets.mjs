// Zet public/kp/v*.js in src/assets.generated.ts zodat de Worker dezelfde
// onveranderlijke laadscript-versies kan serveren. Draai: npm run cf:assets
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const bron = path.resolve(hier, "../../public/kp");
const bestanden = readdirSync(bron).filter((f) => /^v\d+\.js$/.test(f)).sort();
const uit = bestanden.map((f) => `  ${JSON.stringify(f)}: ${JSON.stringify(readFileSync(path.join(bron, f), "utf8"))},`);
writeFileSync(
  path.join(hier, "src/assets.generated.ts"),
  `// GEGENEREERD door build-assets.mjs — niet met de hand aanpassen.\nexport const LOADER_BESTANDEN: Record<string, string> = {\n${uit.join("\n")}\n};\n`
);
console.log(`Laadscripts overgenomen: ${bestanden.join(", ")}`);
