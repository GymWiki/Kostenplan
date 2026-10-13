const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const f=k.seed().a2.facturen;
const body=p=>p.locator("body").innerText();
(async()=>{
// offline
let s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/facturen/"+f.verstuurd});
let p=s.page;
await p.getByRole("button",{name:"Betaling registreren"}).click(); await p.locator("#bt-bedrag").fill("100");
await s.ctx.setOffline(true);
await p.getByRole("button",{name:"Betaling opslaan"}).click(); await p.waitForTimeout(6000);
console.log("OFFLINE body:", (await body(p)).slice(0,300).replace(/\n/g," | ")); await s.scherm("offline-betaling");
await s.ctx.setOffline(false); await p.reload({waitUntil:"networkidle"});
console.log("na reload:", (await body(p)).match(/Betaald\n[^\n]+|Openstaand[^\n]*\n[^\n]+/g));
console.log(s.consoleFouten.slice(-3)); await s.sluit();
// stale tabs
s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/facturen/"+f["te-laat"]});
const A=s.page,B=await s.ctx.newPage(); await B.goto(k.BASE+"/dashboard/facturen/"+f["te-laat"],{waitUntil:"networkidle"});
for (const P of [A,B]) await P.getByRole("button",{name:"Betaling registreren"}).click();
const open=await B.locator("#bt-bedrag").inputValue(); console.log("openstaand B vooraf",open);
await A.locator("#bt-bedrag").fill("1000"); await A.getByRole("button",{name:"Betaling opslaan"}).click(); await A.waitForTimeout(3000);
await B.getByRole("button",{name:"Betaling opslaan"}).click(); await B.waitForTimeout(3000);
console.log("B:", (await body(B)).match(/Openstaand: [^\n]+|Dit is meer[^\n]*|Betaling opgeslagen/g));
await s.scherm("stale"); await B.reload({waitUntil:"networkidle"}); console.log("B na reload:",(await body(B)).match(/Betaald\n[^\n]+|Openstaand[^\n]*\n[^\n]+|· € [\d.,]+ ·/g));
await s.sluit();})();
