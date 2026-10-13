const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Sectie toevoegen" }).click();
  await p.waitForTimeout(800);
  const pr = await p.evaluate(()=>[...document.querySelectorAll('input,textarea,button')].slice(-14).map(e=>(e.tagName+' '+(e.getAttribute('aria-label')||'')+' '+(e.placeholder||'')+' '+(e.innerText||'').slice(0,30)).trim()));
  console.log(pr);
  await s.scherm("sectie-toegevoegd");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
