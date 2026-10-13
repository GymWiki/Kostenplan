const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const L = k.seed().a2.leads["offerte-concept"];
const pad="/dashboard/leads/"+L+"/offerte";
(async()=>{
const s = await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad});
const p=s.page;
await p.getByRole("button",{name:/Sectie toevoegen/}).click(); await p.waitForTimeout(1500);
await p.getByRole("button",{name:/Regel toevoegen/}).last().click(); await p.waitForTimeout(1500);
const ins = await p.locator("input").evaluateAll(els=>els.map((e,i)=>i+"|"+e.id+"|"+e.value));
console.log(ins.slice(-12).join("\n"));
const labels = await p.locator("label").allInnerTexts(); console.log(labels.slice(-14));
await s.scherm("regel");
await s.sluit();})();
