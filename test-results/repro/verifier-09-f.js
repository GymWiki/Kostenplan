const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const txt = async (p, n=3500) => (await p.innerText("body")).replace(/\n+/g, " | ").slice(0, n);
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads?lead=cmv71bere00b6u07dn5u7j1sg" });
  const p = s.page; await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /Factuur maken/ }).first().click();
  await p.waitForTimeout(600);
  console.log("SHEET:", (await p.locator("[role=dialog]").allInnerTexts()).join("||").replace(/\n+/g," | "));
  await p.getByRole("button", { name: /Eindfactuur/ }).click();
  await p.waitForURL(/facturen\//, { timeout: 20000 });
  await p.waitForTimeout(1500);
  console.log("URL", p.url());
  const t = await txt(p, 6000);
  console.log("EIND:", t);
  await s.scherm("eind-concept");
  // Blokkade-teksten
  const bl = p.getByText(/heeft nog geen werkelijke hoeveelheid/);
  console.log("BLOKKADE count", await bl.count());
  if (await bl.count()) {
    console.log("BLOKKADE html:", (await bl.first().evaluate(e => e.parentElement.outerHTML)).slice(0, 800));
  }
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})();
