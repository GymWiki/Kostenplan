const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: /^Versturen/ }).click(); await p.waitForTimeout(1500);
  console.log("URL:", p.url());
  console.log("DIALOG:", (await p.locator('[role=dialog]').allInnerTexts()).map(x=>x.slice(0,800)));
  console.log("KNOPPEN:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(-12)));
  await s.scherm("versturen-klik");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
