const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const sd = JSON.parse(require("fs").readFileSync("/home/user/Kostenplan/test-results/seed.json")).a1;
(async()=>{
 let s = await k.open({agent:"verifier-02",viewport:"mobiel",pad:"/login"});
 console.log("LOGIN", JSON.stringify(await s.page.evaluate(()=>[...document.querySelectorAll("a,button")].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return e.textContent.trim().slice(0,25)+" "+r.width.toFixed(0)+"x"+r.height.toFixed(0)}))));
 await s.sluit();
 for (const p of [`/t/${sd.bedrijfSlug}/${sd.tuinaanlegSlug}`, `/embed/${sd.tools.tuinaanleg}`]) {
  s = await k.open({agent:"verifier-02",viewport:"mobiel",pad:p}); await s.page.waitForTimeout(800);
  const r = await k.axe(s.page); console.log("AXE",p,JSON.stringify([...r.ernstig,...r.overig].filter(v=>v.id==="color-contrast"))); await s.sluit(); }
 s = await k.open({agent:"verifier-02",gebruiker:"a1",viewport:"360",pad:"/dashboard/tools/"+sd.tools.tuinaanleg}); const pg=s.page;
 await pg.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await pg.waitForTimeout(600);
 console.log("TOOL fixed:", JSON.stringify(await pg.evaluate(()=>[...document.querySelectorAll("*")].filter(e=>getComputedStyle(e).position==="fixed").map(e=>{const r=e.getBoundingClientRect();return e.tagName+" top="+r.top.toFixed(0)+" bot="+r.bottom.toFixed(0)+" '"+e.textContent.trim().slice(0,40)+"'"}))));
 console.log("tool scherm", await s.scherm("tool-360")); await s.sluit();
 s = await k.open({agent:"verifier-02",gebruiker:"a1",viewport:"360",pad:"/dashboard/leads?lead="+sd.leads.nieuw}); await s.page.waitForTimeout(1000);
 console.log("LEAD", JSON.stringify(await s.page.evaluate(()=>[...document.querySelectorAll("a,button")].filter(e=>/Bellen|WhatsApp|Offerte maken/.test(e.textContent)&&e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return e.textContent.trim()+" "+r.width.toFixed(0)+"x"+r.height.toFixed(0)}))));
 console.log("lead scherm", await s.scherm("lead-360")); await s.sluit();
})();
