const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  const hits = await s.page.evaluate(() => Array.from(document.querySelectorAll("input,textarea,[contenteditable]")).map(e => (e.tagName+" "+(e.value||e.textContent||"").trim().slice(0,50)+" "+(e.getAttribute("aria-label")||""))).filter(x=>/Grond|Verlicht|Arbeid/.test(x)));
  console.log(hits);
  const c = await s.page.evaluate(() => { const el = Array.from(document.querySelectorAll("*")).find(e => e.children.length===0 && e.textContent.trim()==="Grondwerk en afvoer"); return el ? el.getBoundingClientRect().toJSON() : null; });
  console.log("rect", c);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
