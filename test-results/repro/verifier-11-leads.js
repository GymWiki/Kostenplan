const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-11", gebruiker: "a1", viewport: "desktop", pad: null });
  const p = s.page;
  for (const pad of ["/dashboard", "/dashboard/leads", "/dashboard/facturen/"+s.seed.a1.facturen.betaald, "/dashboard/facturen/"+s.seed.a1.facturen["te-laat"], "/dashboard/facturen/"+s.seed.a1.facturen.creditnota]) {
    s.consoleFouten.length = 0;
    await s.goto(pad);
    console.log("418?", pad, s.consoleFouten.map(x=>x.slice(0,50)));
  }
  const lijst = async (fase) => { await s.goto("/dashboard/leads?fase=" + fase); return (await p.locator("main").innerText()).replace(/\n+/g," | ").slice(0,1500); };
  console.log("AKKOORD:", await lijst("akkoord"));
  console.log("TE-FACTUREREN:", await lijst("te-factureren"));
  await s.scherm("te-factureren");
  await s.goto("/dashboard/leads?fase=te-laat");
  await p.getByText("Lotte Laat").locator("visible=true").first().click();
  await p.waitForTimeout(1000);
  await s.scherm("te-laat-paneel");
  await p.getByRole("link", { name: /Stuur een herinnering/ }).or(p.getByRole("button", { name: /Stuur een herinnering/ })).first().click();
  await p.waitForTimeout(3000);
  console.log("na klik herinnering:", p.url(), "dialoog:", await p.getByRole("dialog").count());
  await s.scherm("na-herinnering");
  await s.sluit();
})().catch((e) => { console.error(e); process.exit(1); });
