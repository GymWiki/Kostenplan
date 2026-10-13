const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const L = k.seed().a2.leads["offerte-concept"];
const pad="/dashboard/leads/"+L+"/offerte";
(async()=>{
const s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad});
const A=s.page, B=await s.ctx.newPage(); await B.goto(k.BASE+pad,{waitUntil:"networkidle"});
const o=p=>p.getByLabel("Onderwerp",{exact:true}), a=p=>p.getByLabel("Aantal",{exact:true}).nth(1);
console.log("start",await o(A).inputValue(),await a(B).inputValue());
await o(A).fill("Tab A onderwerp"); await o(A).blur(); await A.waitForTimeout(3000);
await a(B).fill("7"); await a(B).blur(); await B.waitForTimeout(3000);
console.log("B status",(await B.locator("body").innerText()).match(/Alles opgeslagen|Opslaan…|Niet opgeslagen/)?.[0], "A:", (await A.locator("body").innerText()).match(/Alles opgeslagen|Opslaan…|Niet opgeslagen/)?.[0]);
await A.reload({waitUntil:"networkidle"});
console.log("A na reload onderwerp:",await o(A).inputValue(),"aantal2:",await a(A).inputValue());
console.log("melding over ander tabblad?", /ander tabblad|gewijzigd in/i.test(await B.locator("body").innerText()));
await s.scherm("tabs"); await s.sluit();})();
