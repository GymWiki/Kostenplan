const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const lang = "🌳🌳 " + "Aanleg ".repeat(70);
  await p.getByLabel("Onderwerp").fill(lang); await p.getByLabel("Onderwerp").blur(); await p.waitForTimeout(2500);
  console.log("MELDING onderwerp:", await p.locator("body").innerText().then(t=>t.match(/Niet opgeslagen[\s\S]{0,220}/)?.[0]));
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  // klik op omschrijving om editor te vinden
  s.stap(); await p.getByLabel("Omschrijving").nth(0).click();
  await p.waitForTimeout(500);
  console.log("na klik omschrijving: active=", await p.evaluate(()=>document.activeElement.tagName+" "+(document.activeElement.getAttribute('aria-label')||'')));
  s.stap(); await p.getByText("Bestrating terras").first().click().catch(e=>console.log("x",e.message.slice(0,100)));
  await p.waitForTimeout(800);
  console.log("dialogs:", await p.locator('[role="dialog"]').count(), await p.locator('[role="dialog"]').allInnerTexts().then(a=>a.map(x=>x.slice(0,300))));
  await s.scherm("regel-klik");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
