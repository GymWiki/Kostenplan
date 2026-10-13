const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  console.log(await p.evaluate(()=>[...document.querySelectorAll('table.og-tabel tr')].map(r=>[...r.querySelectorAll('input')].map(i=>i.value).concat([...r.querySelectorAll('td:not(:has(input))')].map(t=>t.innerText.trim())).join(' | ')).join('\n')));
  console.log("ond:", await p.getByLabel("Onderwerp").inputValue());
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
