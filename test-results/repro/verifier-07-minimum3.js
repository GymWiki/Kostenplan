const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
const s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/leads/cmv71jzhm004cb07dektit15x/offerte"});
console.log((await s.page.locator("input").evaluateAll(es=>es.map(e=>e.value))).filter(Boolean).join(" ; ")); await s.sluit();})();
