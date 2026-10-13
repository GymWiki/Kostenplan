const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 const s=await k.open({agent:"verifier-04",gebruiker:"a1",viewport:"desktop",pad:"/dashboard/leads/cmv71be45001ju07dl6bhtjwc/offerte"});
 const r=await s.page.evaluate(()=>[...document.querySelectorAll("*")].filter(e=>e.children.length==0&&/^Verstuurd$/.test(e.textContent.trim())).map(e=>e.parentElement.outerHTML.slice(0,250)));
 console.log(JSON.stringify(r,null,1)); await s.scherm("dubbel-verstuurd");
 await s.goto("/dashboard/facturen/cmv71be7l002qu07d71qafegj");
 const r2=await s.page.evaluate(()=>[...document.querySelectorAll("*")].filter(e=>e.children.length==0&&/^(Verstuurd|Deels betaald)$/.test(e.textContent.trim())).map(e=>e.parentElement.outerHTML.slice(0,250)));
 console.log(JSON.stringify(r2,null,1)); await s.scherm("factuur-statussen"); await s.sluit();
})();
