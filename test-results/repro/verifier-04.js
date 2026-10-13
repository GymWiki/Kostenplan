const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const T = async (s, sel="body") => (await s.page.locator(sel).first().innerText()).replace(/\n+/g," | ");
(async()=>{
 const out=(a,b)=>console.log("\n### "+a+"\n"+b);
 let s=await k.open({agent:"verifier-04",gebruiker:null,viewport:"desktop",pad:"/"});
 out("home footer", (await T(s,"footer")).slice(0,400));
 const th=await s.page.locator("text=Staal").count(); out("home Staal count", th);
 out("home table", await s.page.locator("table").first().innerText().catch(()=>"geen table")); 
 await s.scherm("home-onderdelen");
 await s.goto("/privacybeleid"); out("privacy", await s.page.title()+" || "+await T(s,"h1")); await s.scherm("privacy");
 await s.goto("/algemene-voorwaarden"); out("av", await s.page.title()+" || "+await T(s,"h1")); await s.scherm("av");
 await s.goto("/o/ongeldige-token-123"); out("o404", await s.page.title()+" || "+(await T(s)).slice(0,200)); await s.scherm("o404");
 await s.goto("/f/LSsihuu7RJ9toFLPC8MbcOQOf_JL1Ybs"); out("factuur", (await T(s)).slice(0,700));
 out("bedrag input", JSON.stringify(await s.page.locator("input").evaluateAll(l=>l.map(i=>[i.name,i.value,i.type])))); await s.scherm("factuur-publiek");
 await s.goto("/o/g7exdKwknArNnHY_vQIIOmNSDLEu-oHQ"); out("offerte", (await T(s)).slice(0,1500)); await s.scherm("offerte-publiek");
 await s.sluit();
 for (const vp of ["mobiel","desktop"]) {
  s=await k.open({agent:"verifier-04",gebruiker:"a1",viewport:vp,pad:"/dashboard/profiel/meldingen"});
  out("meldingen "+vp, (await T(s)).slice(0,200)); await s.scherm("meldingen-"+vp);
  await s.goto("/dashboard/profiel"); out("profiel "+vp, (await T(s)).slice(0,500));
  await s.goto("/dashboard/leads/cmv71be45001ju07dl6bhtjwc/offerte"); const t=await T(s); out("offerte dash "+vp, t.slice(0,1500)); await s.scherm("offerte-dash-"+vp);
  await s.sluit();
 }
 s=await k.open({agent:"verifier-04",gebruiker:"a1",viewport:"desktop",pad:"/dashboard/tools/cmv71bdz70003u07dx6qkxpmu/publiceren"});
 out("publiceren", await T(s)); await s.scherm("publiceren");
 await s.goto("/dashboard/tools/cmv71bdz70003u07dx6qkxpmu?paneel=uiterlijk");
 out("uiterlijk placeholders", JSON.stringify(await s.page.locator("input,textarea").evaluateAll(l=>l.map(i=>i.placeholder).filter(Boolean)))); await s.scherm("uiterlijk");
 await s.goto("/dashboard/facturen/cmv71be7l002qu07d71qafegj"); out("factuur dash", (await T(s)).slice(0,700));
 out("h1 area", await s.page.locator("body").first().innerText().then(t=>t.slice(0,300).replace(/\n+/g," | "))); await s.scherm("factuur-dash");
 await s.sluit();
})();
