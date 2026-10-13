const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  console.log("url", p.url());
  console.log((await p.locator("body").innerText()).replace(/\n+/g,' / ').slice(0,1500));
  console.log("KNOPPEN:", await p.evaluate(()=>[...document.querySelectorAll('button,input,textarea')].map(b=>(b.tagName+':'+(b.getAttribute('aria-label')||'')+':'+(b.innerText||b.value||'').trim().slice(0,30))).filter(x=>x.length>6).slice(0,60)));
  await s.scherm("factuur-concept");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
