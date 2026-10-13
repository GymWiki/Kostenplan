// Maakt de voorbeeld-PDF's van facturen met dezelfde code als de app (Chromium + printpagina).
// Vereist een draaiende app op poort 3200 met OFFERTE_VOORBEELDEN=1 (zie start-prod.sh).
//   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/kp CHROMIUM_PATH=… npx tsx --conditions=react-server scripts/mobile-ux/factuur-voorbeeld-pdfs.ts docs/facturen/pdf
import fs from "node:fs";
import { maakOffertePdf } from "../../app/lib/offerte/pdf";
import { maakPrintToken } from "../../app/lib/offerte/pdf-token";
import { VOORBEELD_FACTUREN } from "../../app/lib/factuur/voorbeelden";

const uit = process.argv[2] ?? "docs/facturen/pdf";
const base = process.env.BASE ?? "http://localhost:3200";
fs.mkdirSync(uit, { recursive: true });
const bestandsnamen: Record<string, string> = {
  "factuur-particulier": "1-particulier-9-en-21-procent",
  "factuur-verlegd": "2-zakelijk-btw-verlegd",
  "factuur-kor": "3-kor",
  "factuur-termijn": "4-aanbetaling-30-procent",
  "factuur-eind": "5-eindfactuur-met-aftrek",
  creditnota: "6-creditnota",
  "factuur-lang": "7-meerdere-pagina-s",
};
(async () => {
  for (const [naam, bouw] of Object.entries(VOORBEELD_FACTUREN)) {
    const inhoud = bouw();
    const pdf = await maakOffertePdf(`${base}/offerte-print/${maakPrintToken({ k: "voorbeeld", n: naam })}`, inhoud);
    const pad = `${uit}/${bestandsnamen[naam] ?? naam}.pdf`;
    fs.writeFileSync(pad, pdf);
    console.log(pad, pdf.length);
  }
})().catch((e) => { console.error(e); process.exit(1); });
