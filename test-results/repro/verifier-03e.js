const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 const s = await k.open({agent:"verifier-03",gebruiker:"a1",viewport:"mobiel",pad:null});
 for (const [n,id] of Object.entries(s.seed.a1.leads)){ try{ await s.goto(`/dashboard/leads/${id}/offerte`); const t=await s.page.evaluate(()=>document.body.innerText); const m=t.match(/.{0,25}\b\d+ regels?.{0,25}/g); if(m) {console.log(n,m.map(x=>x.replace(/\n/g," "))); if(/\b1 regels/.test(t)) await s.scherm("1regels-"+n);} }catch(e){console.log(n,e.message)} }
 await s.sluit();
})();
