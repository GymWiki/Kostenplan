const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const L = k.seed().a2.leads["offerte-concept"];
const pad="/dashboard/leads/"+L+"/offerte";
const st=async p=> (await p.locator("body").innerText()).match(/Alles opgeslagen|Opslaan…|Niet opgeslagen[^\n]*|Ongeldige[^\n]*/g);
const tot=async p=>(await p.locator("main").innerText()).match(/Totaal incl. btw\n[^\n]+/)?.[0].replace("\n"," ");
const nieuw=()=>k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad});
(async()=>{
let s=await nieuw(),p=s.page;
const a=p.getByLabel("Aantal",{exact:true}).first();
console.log("aantal voor", await a.inputValue(), await tot(p));
for (const v of ["-5","abc"]) { await a.fill(v); await a.blur(); await p.waitForTimeout(3000); console.log("aantal",v,"->",await a.inputValue(), await st(p), await tot(p)); await s.scherm("aantal-"+v); if(v==="abc"){await p.reload({waitUntil:"networkidle"}); console.log("na reload", await p.getByLabel("Aantal",{exact:true}).first().inputValue(), await tot(p));} }
const o=p.getByLabel("Onderwerp",{exact:true});
await o.fill("Aanleg ".repeat(70)); await o.blur(); await p.waitForTimeout(3000);
console.log("maxlength", await o.getAttribute("maxlength"), await st(p)); await s.scherm("onderwerp-lang");
await p.reload({waitUntil:"networkidle"}); console.log("na reload onderwerp:", await p.getByLabel("Onderwerp",{exact:true}).inputValue());
await s.sluit();
// offline
s=await nieuw(); p=s.page;
await s.ctx.setOffline(true);
await p.getByLabel("Aantal",{exact:true}).first().fill("31"); await p.getByLabel("Onderwerp",{exact:true}).fill("Aanleg tuin offline"); await p.getByLabel("Onderwerp",{exact:true}).blur(); await p.waitForTimeout(6000);
console.log("offline status", await st(p)); await s.scherm("offline");
await s.ctx.setOffline(false); await p.waitForTimeout(8000); console.log("online status", await st(p));
await p.reload({waitUntil:"networkidle"}); console.log("na reload", await p.getByLabel("Aantal",{exact:true}).first().inputValue(), await p.getByLabel("Onderwerp",{exact:true}).inputValue());
console.log(s.consoleFouten.slice(-4));
await s.sluit();
})();
