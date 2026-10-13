const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const sd=k.seed().a2;
(async()=>{
const s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/leads/"+sd.leads["gefactureerd"]+"/offerte"});
const p=s.page; console.log(p.url());
console.log((await p.locator("body").innerText()).split("\n").filter(l=>/factuur|F20|Betaling|Openstaand|Betaald/i.test(l)).slice(0,20));
await s.scherm("fx");await s.sluit();})();
