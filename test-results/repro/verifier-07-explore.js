const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
const s = await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/leads/"+k.seed().a2.leads["offerte-concept"]+"/offerte"});
console.log(s.page.url());
console.log((await s.page.locator("main").innerText()).slice(0,2500));
const inputs = await s.page.locator("input,textarea").evaluateAll(els=>els.map(e=>[e.id,e.getAttribute("aria-label"),e.value].join("|")));
console.log(inputs.slice(0,60).join("\n"));
await s.scherm("explore");await s.sluit();})();
