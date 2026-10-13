const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
(async () => {
  const s = await c.open(); const p = s.page;
  await s.ctx.addInitScript(() => { window.__log = []; window.open = (...a) => { window.__log.push(["open", String(a[0])]); return null; }; window.print = () => window.__log.push(["print"]); });
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await c.vul(s);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  p.on("dialog", (d) => { console.log("DIALOOG", d.message()); d.dismiss(); });
  p.on("popup", (x) => console.log("POPUP", x.url()));
  p.on("download", (x) => console.log("DOWNLOAD", x.suggestedFilename()));
  await p.getByRole("button", { name: /Bewaar als PDF/ }).first().click(); s.stap();
  await p.waitForTimeout(3000);
  console.log("LOG", JSON.stringify(await p.evaluate(() => window.__log)));
  console.log("SCHERM", await s.scherm("pdf-na-3s"));
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
