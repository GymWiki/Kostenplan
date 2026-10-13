const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const sd = JSON.parse(require("fs").readFileSync("/home/user/Kostenplan/test-results/seed.json")).a1;
const beschrijf = () => { const e=document.activeElement; return e.tagName.toLowerCase()+' "'+(e.getAttribute("aria-label")||e.textContent||"").trim().slice(0,35)+'" indialoog='+!!e.closest('[role=dialog]'); };
const gevallen = [
 ["bedrijf-wisselen","/dashboard/profiel",/Bedrijf wisselen/],
 ["betaling-registreren","/dashboard/facturen/"+sd.facturen.verstuurd,/^Betaling registreren$/],
 ["herinnering-sturen","/dashboard/leads/"+sd.leads["offerte-verstuurd"]+"/offerte",/^Herinnering sturen$/],
 ["factuur-maken","/dashboard/leads?lead="+sd.leads.akkoord,/^Factuur maken$/],
];
(async()=>{ for (const [n,p,re] of gevallen){
 const s = await k.open({agent:"verifier-02",gebruiker:"a1",viewport:"mobiel",pad:p}); const pg=s.page; await pg.waitForTimeout(1000);
 const kn = pg.getByRole("button",{name:re}).first(); await kn.scrollIntoViewIfNeeded(); await kn.focus(); await pg.keyboard.press("Enter"); await pg.waitForTimeout(800);
 const dlg = await pg.locator("[role=dialog]").count();
 const log=[]; log.push("na Enter: "+await pg.evaluate(beschrijf));
 for (let i=0;i<6;i++){ await pg.keyboard.press("Tab"); log.push(await pg.evaluate(beschrijf)); }
 await pg.keyboard.press("Escape"); await pg.waitForTimeout(500); log.push("na Esc: "+await pg.evaluate(beschrijf));
 console.log("== "+n+" dialogen="+dlg+"\n  "+log.join("\n  ")); await s.sluit(); }})();
