const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel", maxStappen: 60 });
  const p = s.page;
  console.log("URL", p.url());
  console.log("H1s", await p.locator("h1").allInnerTexts());
  await s.scherm("profiel-kop");
  const kop = p.locator("[aria-haspopup], button").filter({ hasText: /Hoveniers|Groenstijl/ }).first();
  console.log("kop tekst:", (await p.locator("main, body").first().innerText()).slice(0, 900));
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
