const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  const t = await p.locator("body").innerText();
  console.log("Totaal:", t.match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1]);
  console.log("Nieuwe sectie aanwezig:", t.includes("Nieuwe sectie"));
  console.log("Prijzen na reload:", await p.evaluate(()=>[...document.querySelectorAll('tr')].filter(r=>r.querySelector('input[aria-label="Aantal"]')&&/Nieuwe|^$/.test(r.innerText)||r.innerText.includes('Nieuwe')).map(r=>r.innerText.replace(/\s+/g,' ').slice(0,120))));
  await s.scherm("na-reload-sectie");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
