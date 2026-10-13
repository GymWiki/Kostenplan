const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
const s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/leads"});
const p=s.page;
await p.getByText("V07 Boom C").locator("visible=true").first().click(); await p.waitForTimeout(1500);
await p.getByRole("button",{name:/Aanvraag afhandelen/}).click(); await p.waitForTimeout(800);
await p.getByText("Offerte maken in Kostenplan").click(); await p.waitForURL(/offerte/,{timeout:20000}); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
console.log(p.url());
const t=await p.locator("main").innerText(); console.log(t.split("\n").filter(l=>/Transport|minimum|Voorrij|Materiaal|Arbeid|Totaal|Aanvulling|\d,\d\d/.test(l)));
console.log((await p.locator("input").evaluateAll(es=>es.map(e=>e.value))).filter(Boolean).join(" ; ")); await s.scherm("offerte"); await s.sluit();})();
