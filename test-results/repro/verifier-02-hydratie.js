const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const sd = JSON.parse(require("fs").readFileSync("/home/user/Kostenplan/test-results/seed.json")).a1;
const pag = [
 ["login",null,"/login"],["probeer",null,"/probeer"],
 ["tool-publiek",null,`/t/${sd.bedrijfSlug}/${sd.tuinaanlegSlug}`],
 ["o-ingepland",null,"/o/"+sd.offerteTokens.ingepland],["o-verstuurd",null,"/o/"+sd.offerteTokens["offerte-verstuurd"]],["o-akkoord",null,"/o/"+sd.offerteTokens.akkoord],
 ["f-verstuurd",null,"/f/"+sd.factuurTokens.verstuurd],
 ["dashboard","a1","/dashboard"],["leads","a1","/dashboard/leads"],["lead","a1","/dashboard/leads?lead="+sd.leads.nieuw],
 ["offerte","a1","/dashboard/leads/"+sd.leads["offerte-verstuurd"]+"/offerte"],["facturen","a1","/dashboard/facturen"],
 ["factuur-concept","a1","/dashboard/facturen/"+sd.facturen.concept],["factuur-verstuurd","a1","/dashboard/facturen/"+sd.facturen.verstuurd],
 ["profiel","a1","/dashboard/profiel"],["tools","a1","/dashboard/tools"],["tool","a1","/dashboard/tools/"+sd.tools.tuinaanleg],
];
(async()=>{ for (const vpn of ["mobiel","desktop"]) for (const [n,u,p] of pag){
  const s = await k.open({agent:"verifier-02",gebruiker:u,viewport:vpn,pad:p}); await s.page.waitForTimeout(1500);
  console.log(vpn.padEnd(8),n.padEnd(18),u||"anon",s.page.url().replace(s.base,""),"|",s.consoleFouten.map(x=>x.slice(0,60)).join(" ; ")||"geen"); await s.sluit(); }})();
