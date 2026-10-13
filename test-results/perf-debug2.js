const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const p = s.page;
  await p.locator("button:visible").filter({ hasText: /^Alle/ }).first().click({ timeout: 4000 });
  await p.waitForTimeout(300);
  const namen = await p.locator("button:visible").allInnerTexts();
  console.log("LIJST", JSON.stringify(namen.map(x=>x.replace(/\s+/g," ").slice(0,60)).filter(x=>/Nina|Bob|Vic|Vera/.test(x))));
  await p.getByRole("button", { name: /^Nina Nieuw/ }).first().click({ timeout: 4000 });
  await p.getByRole("dialog").waitFor({ timeout: 5000 });
  console.log("DRAWER", JSON.stringify((await p.getByRole("dialog").locator("button").allInnerTexts()).map(x=>x.replace(/\s+/g," ").slice(0,60))));
  await p.keyboard.press("Escape");
  await p.goto(k.BASE + `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`, { waitUntil: "networkidle" });
  const t = await p.locator("button:visible").allInnerTexts();
  console.log("CALC", JSON.stringify(t.map(x=>x.replace(/\s+/g," ").slice(0,50)).filter(x=>/Schutting|Bestrating/.test(x))));
  console.log("SW", JSON.stringify(await p.locator("[role=switch]").evaluateAll(es=>es.map(e=>[e.getAttribute("aria-label"), e.getBoundingClientRect().height>0]))));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
