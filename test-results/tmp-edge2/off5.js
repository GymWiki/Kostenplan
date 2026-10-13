const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const info = await p.getByLabel("Aantal").nth(0).evaluate(el => { let r = el; for (let i=0;i<4 && r.parentElement;i++) r = r.parentElement; return r.outerHTML.slice(0, 2500); });
  console.log(info);
  console.log("prijs-achtig:", await p.evaluate(()=>[...document.querySelectorAll('input,[role=button],button')].filter(e=>/prijs|€|price/i.test((e.getAttribute('aria-label')||'')+(e.name||'')+(e.placeholder||''))).map(e=>e.outerHTML.slice(0,150))));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
