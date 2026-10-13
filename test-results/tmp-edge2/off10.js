const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Sectie toevoegen" }).click(); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: "Regel toevoegen" }).last().click(); await p.waitForTimeout(800);
  const knoppen = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||'')+'|'+b.innerText.trim()).filter(x=>x!=='|'));
  console.log(knoppen.slice(-25));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
