// Zelfde pagina's, maar met browser-tijdzone UTC (= servertijdzone) i.p.v. Europe/Amsterdam
const { chromium } = require("@playwright/test"); const { cookie, GEBRUIKERS } = require("/home/user/Kostenplan/scripts/test/ids.js");
const sd = JSON.parse(require("fs").readFileSync("/home/user/Kostenplan/test-results/seed.json")).a1; const B="http://localhost:3200";
const pag=[["o-ingepland",null,"/o/"+sd.offerteTokens.ingepland],["o-akkoord",null,"/o/"+sd.offerteTokens.akkoord],["lead","a1","/dashboard/leads?lead="+sd.leads.nieuw],["offerte","a1","/dashboard/leads/"+sd.leads["offerte-verstuurd"]+"/offerte"],["factuur-verstuurd","a1","/dashboard/facturen/"+sd.facturen.verstuurd]];
(async()=>{const br=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
for(const tz of ["UTC","Europe/Amsterdam"]) for(const [n,u,p] of pag){const c=await br.newContext({timezoneId:tz,locale:"nl-NL"}); if(u) await c.addCookies([cookie(GEBRUIKERS[u],B)]); const pg=await c.newPage(); const e=[]; pg.on("pageerror",x=>e.push(x.message.slice(0,40)));
 const html=await (await c.request.get(B+p)).text(); await pg.goto(B+p,{waitUntil:"networkidle"}); await pg.waitForTimeout(1000);
 console.log(tz.padEnd(17),n.padEnd(18),e.join(";")||"geen"); await c.close();} await br.close();})();
