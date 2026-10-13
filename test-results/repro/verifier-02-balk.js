const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const sd = JSON.parse(require("fs").readFileSync("/home/user/Kostenplan/test-results/seed.json")).a1;
(async()=>{ for (const vp of ["mobiel","360"]) for (const [n,id,knop] of [["concept",sd.facturen.concept,/Definitief maken/],["verstuurd",sd.facturen.verstuurd,/^Versturen$/],["te-laat",sd.facturen["te-laat"],/Versturen|Herinnering/]]){
 const s = await k.open({agent:"verifier-02",gebruiker:"a1",viewport:vp,pad:"/dashboard/facturen/"+id});
 await s.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await s.page.waitForTimeout(500);
 const r = await s.page.evaluate((src)=>{const re=new RegExp(src); const b=[...document.querySelectorAll("button")].filter(x=>re.test(x.textContent.trim()));
  return b.map(x=>{const q=x.getBoundingClientRect(); const cx=q.x+q.width/2, cy=q.y+q.height/2; const e=document.elementFromPoint(cx,cy);
   return {txt:x.textContent.trim().slice(0,25),top:Math.round(q.top),bot:Math.round(q.bottom),vh:innerHeight,raakt:e===x||x.contains(e),op:e?e.tagName+":"+(e.textContent||"").trim().slice(0,20):null};});},knop.source);
 const nav = await s.page.evaluate(()=>{const n=document.querySelector("nav[aria-label],nav.fixed,body nav:last-of-type");const all=[...document.querySelectorAll("nav")].map(x=>[x.getAttribute("aria-label"),Math.round(x.getBoundingClientRect().top),getComputedStyle(x).position]);return all;});
 console.log(vp,n,JSON.stringify(r),JSON.stringify(nav)); await s.scherm("balk-"+vp+"-"+n); await s.sluit(); }})();
