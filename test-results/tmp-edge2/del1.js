const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  const titels = p.getByLabel("Titel van de sectie");
  console.log("aantal secties:", await titels.count(), await titels.evaluateAll(e=>e.map(x=>x.value)));
  s.stap(); await titels.nth(1).click(); await p.waitForTimeout(800);
  console.log("KNOPPEN:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||'')+':'+b.innerText.trim()).filter(x=>x!==':').slice(-12)));
  await s.scherm("sectie-sheet");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
