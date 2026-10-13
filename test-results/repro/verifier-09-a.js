const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads/cmv71bere00b6u07dn5u7j1sg/offerte" });
  const p = s.page;
  await p.waitForTimeout(1500);
  console.log("OFFERTE:", (await p.innerText("body")).replace(/\n+/g, " | ").slice(0, 6000));
  console.log("ERR", s.consoleFouten);
  await s.scherm("offerte");
  await s.sluit();
})();
