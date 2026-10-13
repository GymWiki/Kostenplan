const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(300);
  await s.page.getByRole("button", { name: "Terug naar de factuur" }).click().catch(()=>{});
  await s.page.waitForTimeout(500);
  const txt = await s.page.locator("body").innerText();
  console.log("dialoog nog open:", txt.includes("Na definitief maken"));
  const dir = "/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad/flow-tester-5";
  fs.mkdirSync(dir, { recursive: true });
  const [dl] = await Promise.all([
    s.page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    s.page.goto("http://localhost:3200/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx").then(() => s.page.getByRole("button", { name: /^PDF$/ }).click()),
  ]);
  if (dl) { await dl.saveAs(dir + "/F2026-0005.pdf"); console.log("PDF opgeslagen", await dl.suggestedFilename()); }
  else console.log("geen download-event; PDF-knop kan een link zijn");
  console.log("ERR", s.consoleFouten.length);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
