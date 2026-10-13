const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const txt = async (p, n=3500) => (await p.innerText("body")).replace(/\n+/g, " | ").slice(0, n);
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/o/ou1Qw8SSMLopXsRCWQ7dyCl3Md55eoeW" });
  const p = s.page; await p.waitForTimeout(1000);
  console.log("PUBLIEK:", await txt(p, 3000));
  // PDF's
  const r1 = await p.request.get(k.BASE + "/api/offertes/cmv71be5t0022u07dfiz5ye8o/pdf?versie=1");
  console.log("PDF status(a3 offerte-id seed)", r1.status());
  await s.goto("/dashboard/leads/cmv71bere00b6u07dn5u7j1sg");
  await p.waitForTimeout(1000);
  console.log("LEAD:", await txt(p, 3000));
  await s.scherm("lead");
  await s.sluit();
})();
