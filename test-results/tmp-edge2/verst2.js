const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: /^Versturen/ }).click(); await p.waitForTimeout(1200);
  const v = p.getByRole("button", { name: "Verder naar versturen" });
  console.log("Verder disabled:", await v.isDisabled());
  s.stap(); await v.dblclick(); await p.waitForTimeout(2500);
  console.log("URL na dubbelklik Verder:", p.url());
  console.log("DIALOG:", (await p.locator('[role=dialog]').allInnerTexts()).map(x=>x.slice(0,700)));
  console.log("BODY kop:", (await p.locator("body").innerText()).slice(0,300).replace(/\n/g,' / '));
  console.log("console:", s.consoleFouten.slice(-4));
  await s.scherm("verder-dubbelklik");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
