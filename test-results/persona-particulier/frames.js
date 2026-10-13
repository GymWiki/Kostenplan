const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
(async () => { const s = await c.open(`/test-embed?tool=${seed.a1.tools.tuinaanleg}&modus=script`); await s.page.waitForTimeout(800);
  for (const f of s.page.frames()) console.log("FRAME", f.url().slice(0,120), (await f.locator("input").count()));
  await s.sluit(); })().catch((e)=>{console.error("FOUT",e.message.slice(0,300));process.exit(1)});
