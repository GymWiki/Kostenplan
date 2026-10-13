const fs = require("fs");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: "/dashboard", maxStappen: 150 });
  const r = await s.ctx.request.get(k.BASE + "/api/facturen/cmv6x0zz3008l7b7dfzjelyuy/pdf");
  fs.writeFileSync(DIR + "document-checker-1-ahmed-factuur-concept.pdf", await r.body());
  console.log("status", r.status(), r.headers()["content-type"]);
  const g = await s.ctx.request.get(k.BASE + "/api/offertes/cmv6wsw9r00979c7dhr58ox4l/pdf");
  console.log("groenstijl offerte pdf status (a2 zonder bedrijfswissel)", g.status());
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
