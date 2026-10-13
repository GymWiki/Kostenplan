const fs = require("fs");
const path = require("path");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1";
const seed = JSON.parse(fs.readFileSync("/home/user/Kostenplan/test-results/seed.json", "utf8"));
const a2 = seed.a2;
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: "/dashboard", maxStappen: 150 });
  const jobs = [];
  for (const [naam, id] of Object.entries(a2.facturen)) jobs.push([`factuur-${naam}`, `/api/facturen/${id}/pdf`]);
  const offIds = { "offerte-concept": "cmv6wsvy800649c7dnoo7bupt", "offerte-verstuurd": "cmv6wsvyi00679c7dd05g4c1u", "offerte-verlopen": "cmv6wsvyv006b9c7dbdtj9u1p", afgewezen: "cmv6wsvz7006f9c7dcqotv8km", akkoord: "cmv6wsvzm006k9c7de5rn4uqe", ingepland: "cmv6wsw00006r9c7dfmn9bssw", opgeleverd: "cmv6wsw11006y9c7dxdsk3zil", gefactureerd: "cmv6wsw1s00779c7dztv76t25", "te-laat": "cmv6wsw38007i9c7dkp5hxuw8", betaald: "cmv6wsw4f007t9c7dixyq8tds", creditnota: "cmv6wsw6i00869c7dwjpeiwit", verloren: "cmv6wsw89008l9c7dhanxgkl4", "groenstijl-verstuurd": "cmv6wsw9r00979c7dhr58ox4l" };
  for (const [naam, id] of Object.entries(offIds)) jobs.push([`offerte-${naam}`, `/api/offertes/${id}/pdf`]);
  const out = [];
  for (const [naam, url] of jobs) {
    const r = await s.ctx.request.get(k.BASE + url);
    const body = await r.body();
    const f = path.join(DIR, `document-checker-1-${naam}.pdf`);
    if (r.ok()) fs.writeFileSync(f, body);
    out.push(`${r.status()} ${r.headers()["content-type"]} ${body.length}B ${naam}`);
  }
  // anoniem via token
  const anon = await s.browser.newContext();
  const tok = [...Object.entries(a2.factuurTokens).map(([n, t]) => [`factuur-${n}`, `/f/${t}/pdf`]), ...Object.entries(a2.offerteTokens).map(([n, t]) => [`offerte-${n}`, `/f/${t}/pdf`])];
  for (const [naam, url] of tok) {
    const r = await anon.request.get(k.BASE + url);
    const body = await r.body();
    if (r.ok()) fs.writeFileSync(path.join(DIR, `document-checker-1-anon-${naam}.pdf`), body);
    out.push(`ANON ${r.status()} ${r.headers()["content-type"]} ${body.length}B ${naam}`);
  }
  await anon.close();
  console.log(out.join("\n"));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
