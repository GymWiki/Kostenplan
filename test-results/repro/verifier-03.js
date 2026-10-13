const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs=require("fs");
const grab = async (s, pad, naam, res) => { await s.goto(pad); await s.page.waitForTimeout(800);
  const t = await s.page.evaluate(()=>document.body.innerText);
  const attrs = await s.page.evaluate(()=>[...document.querySelectorAll("[title],[aria-label]")].map(e=>(e.getAttribute("aria-label")||"")+"|"+(e.getAttribute("title")||"")).filter(x=>/zoom|javascript/i.test(x)));
  res[naam]={pad,t,attrs}; await s.scherm(naam); };
(async()=>{
 const res={};
 const A = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"desktop",pad:null});
 const seed=A.seed.a1;
 for (const [n,p] of [["offerte-instellingen","/dashboard/profiel/offerte-instellingen"],["tools","/dashboard/tools"],["werkgebied","/dashboard/profiel/werkgebied"],["facturen","/dashboard/facturen"],["leads","/dashboard/leads"],["dashboard","/dashboard"],["profiel","/dashboard/profiel"],["publiceren","/dashboard/tools/"+seed.tools.tuinaanleg+"/publiceren"],["uiterlijk","/dashboard/tools/"+seed.tools.tuinaanleg+"/uiterlijk"]]) await grab(A,p,n,res).catch(e=>res[n]={err:e.message});
 await A.sluit();
 const B = await k.open({agent:"verifier-03",viewport:"desktop",pad:null});
 for (const [n,p] of [["templates","/rekentool-templates"],["home","/"],["login","/login"],["registreren","/registreren"],["portaal","/portaal/devries-a1"],["kennisbank","/kennisbank"],["features","/features"],["hoveniers","/voor/hoveniers"],["offertecalc","/offerte-calculator"]]) await grab(B,p,n,res).catch(e=>res[n]={err:e.message});
 await B.sluit();
 fs.writeFileSync("/home/user/Kostenplan/test-results/repro/verifier-03-dump.json",JSON.stringify(res,null,1));
})();
