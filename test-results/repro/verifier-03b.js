const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 const s = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"mobiel",pad:"/dashboard/leads"});
 const links = await s.page.evaluate(()=>[...document.querySelectorAll("a[href*='/dashboard/leads/']")].map(a=>a.href+" :: "+a.innerText.replace(/\n/g," ").slice(0,50)));
 console.log(links.slice(0,12).join("\n"));
 for (const l of links){ const id=l.split(" :: ")[0]; if(/Nina|Ilse/.test(l)){ await s.goto(new URL(id).pathname+"/offerte"); const t=await s.page.evaluate(()=>document.body.innerText); console.log(l.slice(-40), (t.match(/.{30}\b\d+ regels?.{20}/g)||[]).join(" | ")); await s.scherm("offerte-"+l.slice(-20)); } }
 // mobiel statusgedrag
 const t0 = await s.page.evaluate(()=>document.body.innerText); console.log((t0.match(/.{20}In [cC]ontact.{10}/g)||[]).join(" | "));
 await s.sluit();
 const d = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"desktop",pad:"/dashboard/facturen"});
 const hr = await d.page.evaluate(()=>[...document.querySelectorAll("a[href*='/dashboard/facturen/']")].map(a=>a.href));
 console.log(hr.slice(0,6));
 for (const h of hr.slice(0,6)){ await d.goto(new URL(h).pathname); const t=await d.page.evaluate(()=>document.body.innerText); const m=t.match(/.{20}te laat.{5}/g); if(m) console.log(h,m); }
 const tp = await k.open({agent:"verifier-03",viewport:"desktop",pad:"/rekentool-templates"});
 console.log(await tp.page.evaluate(()=>[...document.querySelectorAll("h1,h2")].map(h=>h.tagName+" "+h.innerText).join("\n")));
 await tp.scherm("templates-kop");
 await tp.sluit(); await d.sluit();
})();
