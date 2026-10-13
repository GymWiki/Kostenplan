const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = `/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g`;
const samen = (t) => t.replace(/\n+/g,' | ').match(/Betaald[^]{0,110}/)?.[0];
(async () => {
  const a = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const b = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  for (const s of [a, b]) { s.stap(); await s.page.getByRole("button", { name: "Betaling registreren" }).click(); await s.page.waitForTimeout(600); }
  a.stap(); await a.page.getByLabel("Bedrag (€)").fill("1000");
  a.stap(); await a.page.getByRole("button", { name: "Betaling opslaan" }).click(); await a.page.waitForTimeout(2500);
  console.log("A na opslaan:", samen(await a.page.locator("body").innerText()));
  // B (stale: openstaand 3037,97) betaalt het hele openstaande bedrag
  b.stap(); await b.page.getByLabel("Bedrag (€)").fill("3037,97");
  b.stap(); await b.page.getByRole("button", { name: "Betaling opslaan" }).click(); await b.page.waitForTimeout(2500);
  console.log("B dialoog open:", await b.page.locator('[role=dialog]').count(), "| B tekst:", samen(await b.page.locator("body").innerText()));
  console.log("B dialoogtekst:", (await b.page.locator('[role=dialog]').allInnerTexts()).map(x=>x.replace(/\n+/g,' / ').slice(0,300)));
  await b.scherm("B-stale-betaling");
  await a.page.reload({ waitUntil: "networkidle" });
  console.log("A na reload:", samen(await a.page.locator("body").innerText()));
  await a.scherm("A-na-reload");
  await a.sluit(); await b.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
