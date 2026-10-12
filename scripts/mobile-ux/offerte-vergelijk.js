// Controle 8: schermafbeelding van het document naast dezelfde pagina uit de PDF.
//   OFFERTE=<offerteId> LEAD=<leadId> node scripts/mobile-ux/offerte-vergelijk.js <uitmap>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3200", UIT = process.argv[2] || "docs/offerte-v2/schermen";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1300 }, deviceScaleFactor: 1 });
  await ctx.addCookies([require("./cookie.js")()]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/dashboard/leads/${process.env.LEAD}/offerte`, { waitUntil: "networkidle" });
  await p.waitForSelector("[data-offerte-document]");
  await p.addStyleTag({ content: "aside{display:none!important}" });
  await p.waitForTimeout(800);
  const el = await p.locator("[data-offerte-document]").boundingBox();
  await p.screenshot({ path: "/tmp/scherm.png", clip: { x: el.x, y: el.y, width: el.width, height: Math.round(el.width * 297 / 210) } });
  const pdf = await ctx.request.get(`${BASE}/api/offertes/${process.env.OFFERTE}/pdf`);
  fs.writeFileSync("/tmp/vergelijk.pdf", await pdf.body());
  execSync(`pdftoppm -r ${Math.round(el.width / 210 * 25.4)} -png -f 1 -l 1 /tmp/vergelijk.pdf /tmp/pdfpagina`);
  const png = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
  const files = fs.readdirSync("/tmp").filter((f) => /^pdfpagina.*\.png$/.test(f));
  const pg = await ctx.newPage();
  await pg.setContent(`<body style="margin:0;background:#e5e7eb;font:16px system-ui"><div style="display:flex;gap:24px;padding:24px"><figure style="margin:0"><figcaption style="padding:0 0 8px;font-weight:600">Scherm (editor)</figcaption><img src="${png("/tmp/scherm.png")}" style="width:760px;box-shadow:0 2px 12px #0003"></figure><figure style="margin:0"><figcaption style="padding:0 0 8px;font-weight:600">PDF (pagina 1)</figcaption><img src="${png("/tmp/" + files[0])}" style="width:760px;box-shadow:0 2px 12px #0003"></figure></div></body>`);
  await pg.setViewportSize({ width: 1640, height: 1200 });
  await pg.screenshot({ path: `${UIT}/vergelijking-scherm-pdf.png`, fullPage: true });
  await b.close();
})();
