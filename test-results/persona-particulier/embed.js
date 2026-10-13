const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
(async () => {
  const tool = seed.a1.tools.tuinaanleg;
  const s = await c.open(`/test-embed?tool=${tool}&modus=script`); const p = s.page;
  await p.waitForTimeout(1500);
  console.log("URL", p.url(), "frames", p.frames().length);
  console.log("SCHERM", await s.scherm("embed-start"));
  console.log((await p.innerText("body")).slice(0, 1500));
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
