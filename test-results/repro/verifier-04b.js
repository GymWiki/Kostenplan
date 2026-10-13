const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async()=>{
 let s=await k.open({agent:"verifier-04",viewport:"desktop",pad:"/"});
 console.log("FOOTER", await s.page.locator("footer a").allInnerTexts());
 const el=s.page.locator("text=Staal").first(); await el.scrollIntoViewIfNeeded();
 console.log("STAAL ctx", (await el.locator("xpath=ancestor::*[self::section or self::table][1]").innerText()).replace(/\n+/g," | ").slice(0,600));
 await s.scherm("staal"); await s.sluit();
 s=await k.open({agent:"verifier-04",gebruiker:"a1",viewport:"desktop",pad:"/dashboard/leads/cmv71be45001ju07dl6bhtjwc/offerte"});
 console.log("HEAD", (await s.page.locator("h1,h2,[class*=badge],[class*=status]").allInnerTexts()).slice(0,12)); await s.scherm("offerte-kop");
 await s.goto("/dashboard/facturen/cmv71be7l002qu07d71qafegj"); console.log("FHEAD", (await s.page.locator("h1,h2,[class*=badge],[class*=status]").allInnerTexts()).slice(0,12)); await s.scherm("factuur-kop");
 await s.sluit();
})();
