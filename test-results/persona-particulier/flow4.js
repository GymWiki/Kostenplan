const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
(async () => {
  const s = await c.open(); const p = s.page;
  await c.vul(s);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  console.log("SCHERM raming", await s.scherm("raming-bovenaan"));
  await p.getByRole("button", { name: "Offerte aanvragen" }).click(); s.stap();
  await p.waitForTimeout(1000);
  console.log("URL NA KLIK", p.url());
  console.log("SCHERM na offerte-klik", await s.scherm("offerte-aanvragen"));
  console.log((await p.innerText("body")).slice(0, 3000));
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
