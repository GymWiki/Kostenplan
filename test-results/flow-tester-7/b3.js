const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "b", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 80 });
  const p = s.page;
  s.stap();
  const tekst = await p.locator("body").innerText();
  console.log("leads:", tekst.replace(/\n+/g, " | ").slice(0, 700));
  await s.scherm("b-leads");
  const naam = tekst.split("\n").find((l) => /Nieuw|Nina|Hans|Bestrating|Tuin|Heg|Vera|Gina|\w+ \w+/.test(l) && l.length < 40 && !/Alle|Nieuw \(|Overzicht|Leads|Profiel|Rekentools/.test(l));
  console.log("probeer lead:", naam);
  s.stap(); await p.getByText(/\S/).first();
  const first = p.locator("main").getByText(/·|€/).first();
  await p.locator("body").evaluate(() => {});
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
