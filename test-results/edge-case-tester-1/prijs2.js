const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
const url = "/dashboard/tools/" + seed.a3.tools.tuinaanleg + "/bouwer";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: url, maxStappen: 250 });
  await s.page.waitForTimeout(1000);
  const t = await s.page.innerText("body");
  console.log(t.replace(/\n+/g, " | ").slice(0, 1200));
  await s.scherm("bouwer-na-reload");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
