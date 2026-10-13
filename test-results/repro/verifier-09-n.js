const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const pad = ["/dashboard", "/dashboard/leads", "/dashboard/leads/cmv71bere00b6u07dn5u7j1sg/offerte", "/dashboard/leads/cmv71beqr00atu07d25baelk4/offerte", "/dashboard/facturen/cmv71dj620032b07d5kl4z0pm", "/dashboard/facturen/cmv71embe003jb07d715kgnul", "/dashboard/facturen/cmv71bese00c0u07d5gvi9mky", "/dashboard/profiel", "/dashboard/leads/cmv71bere00b6u07dn5u7j1sg/offerte"];
  for (const u of pad) {
    const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: null });
    await s.goto(u); await s.page.waitForTimeout(1500);
    console.log(u, "=>", s.consoleFouten.map(x => x.slice(0, 60)));
    await s.sluit();
  }
})();
