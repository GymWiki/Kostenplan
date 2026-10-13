const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const OF="/dashboard/leads/cmv71jzhm004cb07dektit15x/offerte";
const PDF="/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad/voorwaarden.pdf";
async function versturen(s){const p=s.page; await p.getByRole("button",{name:"Versturen"}).first().click(); await p.waitForTimeout(1200);
 const d=await p.locator("body").innerText(); console.log("  Let op av:", /geen algemene voorwaarden bijgevoegd/.test(d), "| meegestuurd:", /voorwaarden worden meegestuurd/.test(d));
 const b=p.getByRole("button",{name:"Verder naar versturen"}); console.log("  verder disabled:", await b.isDisabled());
 if(!(await b.isDisabled())){await b.click(); await p.waitForTimeout(2500); console.log("  na verder:", (await p.locator("body").innerText()).match(/versturen|klaargezet|PDF/i)?.[0], (await p.locator("[role=dialog]").first().innerText().catch(()=>"")).slice(0,150).replace(/\n/g," "));}}
(async()=>{
let s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:OF}); console.log("voor upload"); await versturen(s); await s.scherm("voor"); await s.sluit();
s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:"/dashboard/profiel/offerte-instellingen"});
await s.page.locator("input[type=file]").first().setInputFiles(PDF); await s.page.waitForTimeout(4000);
console.log("profiel:", (await s.page.locator("body").innerText()).match(/voorwaarden\.pdf/)?.[0]); await s.sluit();
s=await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad:OF}); console.log("na upload, bestaande offerte"); await versturen(s); await s.scherm("na"); await s.sluit();
})();
