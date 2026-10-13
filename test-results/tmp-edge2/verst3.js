const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: /^Versturen/ }).click(); await p.waitForTimeout(1200);
  console.log("Verder disabled:", await p.getByRole("button", { name: "Verder naar versturen" }).isDisabled().catch(()=>"n/a"));
  console.log("DIALOG:", (await p.locator('[role=dialog]').allInnerTexts()).map(x=>x.slice(0,400)));
  await s.scherm("flow-stap1");
  s.stap(); await p.getByRole("button", { name: "Verder naar versturen" }).click(); await p.waitForTimeout(2000);
  console.log("URL na Verder:", p.url());
  console.log("BODY:", (await p.locator('[role=dialog]').count()) , (await p.locator("body").innerText()).replace(/\n+/g,' / ').slice(0,700));
  await s.scherm("flow-stap2");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
