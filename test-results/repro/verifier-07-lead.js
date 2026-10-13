const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
const s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/leads"});
const p=s.page;
await p.getByText("V07 Boom C").locator("visible=true").first().click(); await p.waitForTimeout(1500);
console.log(await p.locator("a, button").evaluateAll(es=>es.filter(e=>e.offsetParent&&/offerte/i.test(e.innerText||e.getAttribute("aria-label")||"")).map(e=>(e.tagName+":"+(e.innerText||"").slice(0,50)+":"+(e.getAttribute("href")||"")))));
await s.scherm("lead2"); await s.sluit();})();
