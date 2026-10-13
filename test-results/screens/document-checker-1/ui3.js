const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
const a2 = k.seed().a2;
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("main a, main button, main [role=button], main [role=menuitem], main label, main input")].map((e) => (e.innerText || e.getAttribute("aria-label") || e.getAttribute("name") || e.type || "").trim().replace(/\s+/g, " ") + (e.getAttribute("href") ? " [" + e.getAttribute("href") + "]" : "")).filter(Boolean).slice(0, 80).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  const r = await s.ctx.request.get(k.BASE + `/api/offertes/${a2.leads.akkoord ? "cmv6wsvzm006k9c7de5rn4uqe" : ""}/pdf?getekend=1`);
  fs.writeFileSync(DIR + "document-checker-1-offerte-akkoord-getekend.pdf", await r.body());
  console.log("getekend status", r.status(), r.headers()["content-type"]);
  await s.goto(`/dashboard/leads`);
  const link = s.page.getByRole("link", { name: /Ahmed Akkoord/ }).first();
  console.log("link href:", await link.getAttribute("href").catch(() => "geen"));
  await link.click().catch((e) => console.log("klik:", e.message));
  await s.page.waitForLoadState("networkidle").catch(() => {});
  console.log("URL:", s.page.url());
  console.log("=== knoppen\n" + await knoppen(s));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
