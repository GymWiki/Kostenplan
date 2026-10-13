const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const kopStatus = async (p) => (await p.locator("body").innerText()).match(/Offerte 2026-0114\n([^\n]+)/)?.[1];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: /^Versturen/ }).click(); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: "Verder naar versturen" }).click(); await p.waitForTimeout(1500);
  console.log("VOOR F5 kopstatus:", await kopStatus(p), "| Ja-knop:", await p.getByRole("button", { name: /Ja, verstuurd/ }).count());
  await s.scherm("voor-f5");
  s.stap(); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  console.log("NA F5 kopstatus:", await kopStatus(p), "| Ja-knop:", await p.getByRole("button", { name: /Ja, verstuurd/ }).count(), "| dialogen:", await p.locator('[role=dialog]').count());
  // terug-knop
  s.stap(); await p.goBack({ waitUntil: "networkidle" }).catch(e=>console.log("back fout", e.message.slice(0,120)));
  console.log("NA BACK url:", p.url());
  await s.scherm("na-back");
  s.stap(); await p.goForward({ waitUntil: "networkidle" }).catch(e=>console.log("fwd fout", e.message.slice(0,120)));
  console.log("NA FORWARD url:", p.url(), "kop:", await kopStatus(p));
  console.log("console:", s.consoleFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
