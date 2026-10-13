const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
(async () => {
  const dir = "/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad";
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads" });
  for (const [n, u] of [["getekend", "/api/offertes/cmv71berg00b7u07dk26o81aa/pdf?getekend=1"], ["normaal", "/api/offertes/cmv71berg00b7u07dk26o81aa/pdf?versie=1"]]) {
    const r = await s.page.request.get(k.BASE + u, { timeout: 90000 });
    console.log(n, r.status());
    if (r.status() === 200) fs.writeFileSync(`${dir}/ahmed-${n}.pdf`, await r.body());
  }
  await s.sluit();
})();
