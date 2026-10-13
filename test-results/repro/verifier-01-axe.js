const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const sd = k.seed().a1;
  const pagina = [
    ["dashboard","/dashboard"],["leads","/dashboard/leads"],
    ["offerte","/dashboard/leads/"+sd.leads["offerte-concept"]+"/offerte"],
    ["facturen","/dashboard/facturen"],["factuur","/dashboard/facturen/"+sd.facturen.concept],
    ["tools","/dashboard/tools"],["bouwer","/dashboard/tools/"+sd.tools.tuinaanleg+"/bouwer"],
    ["profiel","/dashboard/profiel"],["werkgebied","/dashboard/profiel/werkgebied"],
    ["offerte-instellingen","/dashboard/profiel/offerte-instellingen"],["probeer","/probeer"],
  ];
  for (const [n,p] of pagina) {
    const s = await k.open({ agent:"verifier-01", gebruiker: n==="probeer"?null:"a1", viewport:"desktop", pad:p });
    await s.page.waitForTimeout(1500);
    await s.page.evaluate(require("axe-core").source);
    const r = await s.page.evaluate(() => window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));
    console.log("== "+n+" "+p);
    for (const v of r.violations) { console.log(" ",v.id,v.impact,v.nodes.length);
      for (const nd of v.nodes.slice(0,3)) console.log("    ",nd.target.join(" "),"|",nd.html.slice(0,110).replace(/\n/g," "),"|",(nd.any[0]||nd.all[0]||nd.none[0]||{}).message?.slice(0,140)); }
    await s.sluit();
  }
})();
