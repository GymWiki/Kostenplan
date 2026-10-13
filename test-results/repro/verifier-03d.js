const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 const s = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"desktop",pad:"/dashboard/leads"});
 const hr = await s.page.evaluate(()=>[...new Set([...document.querySelectorAll("a[href*='/dashboard/leads/']")].map(a=>new URL(a.href).pathname))]);
 console.log(hr.length);
 for (const h of hr){ await s.goto(h+"/offerte"); const t=await s.page.evaluate(()=>document.body.innerText); const m=t.match(/.{0,25}\b\d+ regels?.{0,25}/g); if(m) console.log(h,m.map(x=>x.replace(/\n/g," "))); if(/\b1 regels/.test(t)) await s.scherm("1regels"); }
 await s.sluit();
 const m = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"mobiel",pad:"/dashboard/leads"});
 console.log(await m.page.evaluate(()=>(document.body.innerText.match(/.{0,30}[Ii]n [Cc]ontact.{0,20}/g)||[]).join(" | ")));
 await m.sluit();
})();
