const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
(async () => {
  const dir = "/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad";
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads" });
  const items = { f5: "/api/facturen/cmv71dj620032b07d5kl4z0pm/pdf", f6: "/api/facturen/cmv71fs0i003qb07dkybtqi5q/pdf", fseed: "/api/facturen/cmv71bes200bru07dm3f3jbe0/pdf" };
  for (const [n, u] of Object.entries(items)) {
    const r = await s.page.request.get(k.BASE + u, { timeout: 90000 });
    console.log(n, r.status(), r.headers()["content-type"]);
    if (r.status() === 200) fs.writeFileSync(`${dir}/${n}.pdf`, await r.body());
  }
  // Groenstijl offerte pdf
  await s.sluit();
})();
