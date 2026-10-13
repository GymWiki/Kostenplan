const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  for (const [naam, gebr, pad] of [["calculator","a1","/dashboard/tools/"+k.seed().a1.tools.tuinaanleg+"/calculator"],["landing",null,"/"],["probeer",null,"/probeer"]]) {
    const s = await k.open({ agent: "verifier-11", gebruiker: gebr, viewport: "mobiel", pad: null });
    let n=0, js=0, jsN=0, tot=0, wire=0, wireJs=0; const taken=[];
    s.page.on("response", (r) => taken.push(r));
    await s.goto(pad); await s.page.waitForTimeout(500);
    for (const r of taken) { try { const b = await r.body(); const t=r.request().resourceType(); n++; tot+=b.length; const enc=r.headers()["content-encoding"]; if (t==="script"){jsN++; js+=b.length; wireJs+=require("zlib").gzipSync(b).length;} } catch {} }
    console.log(naam, "requests", n, "scripts", jsN, "JS KB(body)", Math.round(js/1024), "totaal KB", Math.round(tot/1024), "gzipJS KB", Math.round(wireJs/1024), "enc:", taken.find(r=>r.request().resourceType()==="script")?.headers()["content-encoding"]);
    await s.sluit();
  }
})();
