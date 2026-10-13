const start = require("./lib.js");
const fs = require("fs");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await p.goto("http://localhost:3200/dashboard/leads/cmv6wswof00ds9c7ditpi67yx/offerte", { waitUntil: "networkidle" });
  const href = await p.locator("a[href*='/pdf']").first().getAttribute("href");
  console.log("pdf href", href);
  const r = await p.request.get("http://localhost:3200" + href);
  console.log("status", r.status(), r.headers()["content-type"]);
  fs.mkdirSync("pdf", { recursive: true });
  fs.writeFileSync("pdf/groen-concept.pdf", await r.body());
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
