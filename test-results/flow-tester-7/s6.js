const start = require("./lib.js");
const fs = require("fs");
(async () => {
  const s = await start(null, 150, "mobiel");
  const p = s.page;
  await s.wissel("Groenstijl Tuinen");
  await s.goto2("/dashboard/leads");
  const alle = await p.locator("a").evaluateAll((els) => els.map((e) => `${e.innerText.trim().replace(/\n/g," ").slice(0,50)} -> ${e.getAttribute("href")}`).filter(x=>/Gina|Hans|leads\//.test(x)));
  console.log("links:", alle);
  const r = await p.request.get(k_base() + "/api/offertes/cmv6wswon00du9c7dnf9z32ig/pdf?versie=1");
  const buf = await r.body();
  const dir = "/home/user/Kostenplan/test-results/flow-tester-7/pdf";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + "/groen-offerte.pdf", buf);
  console.log("pdf status", r.status(), r.headers()["content-type"], buf.length);
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
function k_base(){ return "http://localhost:3200"; }
