const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const a2 = k.seed().a2;
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=menuitem],[role=tab],select,input")].map((e) => (e.innerText || e.getAttribute("aria-label") || e.getAttribute("name") || e.type || "").trim().replace(/\s+/g, " ") + (e.getAttribute("href") ? " [" + e.getAttribute("href") + "]" : "")).filter((x) => x && !/^(Direct|Kostenplan|Naar|Overzicht|Rekentools|Profiel|Leads)/.test(x)).slice(0, 60).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/leads/${a2.leads.akkoord}/offerte`);
  await s.page.waitForTimeout(500);
  console.log("=== offerte knoppen\n" + await knoppen(s));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
