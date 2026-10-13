const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "b", viewport: "mobiel", pad: "/dashboard/facturen", maxStappen: 80 });
  const p = s.page;
  console.log("facturen:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 500));
  await s.scherm("b-facturen");
  s.stap(); await p.goto(k.BASE + "/dashboard/tools", { waitUntil: "networkidle" });
  console.log("tools:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 400));
  s.stap(); await p.goto(k.BASE + "/dashboard", { waitUntil: "networkidle" });
  console.log("dashboard:", (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 600));
  await s.scherm("b-dashboard");
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
