const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte", maxStappen: 20 });
  const p = s.page;
  const body = await p.evaluate(() => document.body.innerText);
  console.log(body.slice(0, 2500));
  console.log("----VERSTUREN/VERDER buttons:", await p.$$eval("button,a", els => els.map(e=>e.innerText.trim()).filter(t=>t).slice(0,60)));
  await s.sluit();
})();
