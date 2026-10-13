const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/facturen/cmv71dj620032b07d5kl4z0pm" });
  const p = s.page; await p.waitForTimeout(1000);
  console.log("HEAD:", (await p.locator("main").first().innerText()).slice(0, 500).replace(/\n+/g," | "));
  console.log("HTMLHEAD:", (await p.locator("main").first().innerHTML()).slice(0, 2500));
  await s.scherm("na-reload");
  await s.sluit();
})();
