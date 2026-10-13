const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.locator("tr.og-sectiekop").nth(1).locator("td").last().click(); await p.waitForTimeout(800);
  console.log("KNOPPEN1:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||'')+':'+b.innerText.trim()).filter(x=>x!==':').slice(-8)));
  s.stap(); await p.locator("tr.og-sectiekop").nth(1).locator("td").first().click(); await p.waitForTimeout(800);
  console.log("KNOPPEN2:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||'')+':'+b.innerText.trim()).filter(x=>x!==':').slice(-8)));
  await s.scherm("sectie-klik2");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
