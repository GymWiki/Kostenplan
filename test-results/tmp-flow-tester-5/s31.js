const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  const a = s.page.getByLabel("Aantal", { exact: true }).first();
  console.log("VOOR:", await a.inputValue());
  await a.fill("24");
  await a.press("Tab");
  await s.page.waitForTimeout(1200);
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(400);
  const t = await s.page.locator("body").innerText();
  console.log("Tuin-totaal:", (t.match(/Tuin Kerkstraat 5\s*\n?\s*€ [\d.,]+/)||["?"])[0]);
  await s.scherm("bestrating-hersteld");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
