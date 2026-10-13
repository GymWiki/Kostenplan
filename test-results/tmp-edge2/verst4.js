const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: /^Versturen/ }).click(); await p.waitForTimeout(1000);
  s.stap(); await p.getByRole("button", { name: "Verder naar versturen" }).click(); await p.waitForTimeout(2000);
  console.log("ja-knop aanwezig:", await p.getByRole("button", { name: /Ja, verstuurd/ }).count());
  console.log("dialogen:", await p.locator('[role=dialog],[role=alertdialog]').count());
  console.log("knoppen:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(-10)));
  console.log("tekst met Verstuur:", (await p.locator("body").innerText()).match(/[^\n]*(verstuur|Verstuur|verzend)[^\n]*/g));
  await s.scherm("na-verder");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
