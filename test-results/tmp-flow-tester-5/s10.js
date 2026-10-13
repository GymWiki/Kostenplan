const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  await s.scherm("f2026-0005-na-definitief");
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
