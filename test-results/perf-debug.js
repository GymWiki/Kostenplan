const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const p = s.page;
  const c1 = await p.locator("button:visible").filter({ hasText: /^Akkoord/ }).count();
  console.log("akkoord zichtbaar:", c1, "totaal:", await p.locator("button").filter({ hasText: /^Akkoord/ }).count());
  try { await p.locator("button:visible").filter({ hasText: /^Akkoord/ }).first().click({ timeout: 4000 }); console.log("chip ok"); } catch (e) { console.log("chip FOUT", e.message.split("\n").slice(0, 6).join(" | ").slice(0, 500)); }
  await p.getByRole("button", { name: /^Nina Nieuw/ }).first().click({ timeout: 4000 });
  await p.getByRole("dialog").waitFor({ timeout: 5000 });
  const knop = p.getByRole("button", { name: /Zet op In contact/ });
  console.log("zet count", await knop.count(), "visible", await knop.first().isVisible().catch(() => "x"));
  try { await knop.first().click({ timeout: 4000 }); console.log("zet ok"); } catch (e) { console.log("zet FOUT", e.message.split("\n").slice(0, 6).join(" | ").slice(0, 500)); }
  await p.keyboard.press("Escape");
  await p.goto(k.BASE + `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`, { waitUntil: "networkidle" });
  const sw = p.getByRole("switch", { name: /Zichtbaar voor klanten: Schutting/ });
  console.log("sw count", await sw.count());
  try { await sw.first().click({ timeout: 4000 }); console.log("sw ok"); } catch (e) { console.log("sw FOUT", e.message.split("\n").slice(0, 8).join(" | ").slice(0, 700)); }
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
