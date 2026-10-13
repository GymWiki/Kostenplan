const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 const s = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"mobiel",pad:"/dashboard/leads"});
 const hr = await s.page.evaluate(()=>[...new Set([...document.querySelectorAll("a[href^='/dashboard/leads/']")].map(a=>a.getAttribute("href").split("?")[0]))]);
 console.log(hr.length);
 for (const h of hr){ await s.goto(h+"/offerte"); const t=await s.page.evaluate(()=>document.body.innerText); const m=t.match(/.{0,25}\b1 regels?.{0,25}/g); if(m) {console.log(h,m); await s.scherm("1regels");} }
 await s.sluit();
})();
