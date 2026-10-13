const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const a2 = k.seed().a2;
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=menuitem]")].map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ") + (e.getAttribute("href") ? " [" + e.getAttribute("href") + "]" : "")).filter(Boolean).slice(0, 60).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/leads/${a2.leads.akkoord}/offerte`);
  const g = s.page.getByRole("link", { name: /Getekende PDF/ }).or(s.page.getByRole("button", { name: /Getekende PDF/ }));
  console.log("GETEKEND:", await g.first().evaluate((e) => e.outerHTML.slice(0, 300)).catch((e) => "geen: " + e.message));
  const dl = s.page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  await g.first().click().catch((e) => console.log("klik mislukt", e.message));
  const d = await dl;
  if (d) { await d.saveAs(DIR + "document-checker-1-ahmed-getekend.pdf"); console.log("download:", d.suggestedFilename()); }
  else console.log("geen download; url nu:", s.page.url());
  await s.goto(`/dashboard/leads/${a2.leads.akkoord}`);
  await s.page.waitForTimeout(500);
  console.log("=== LEAD AHMED knoppen\n" + await knoppen(s));
  await s.goto(`/dashboard/facturen`);
  console.log("=== FACTUREN knoppen\n" + await knoppen(s));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
