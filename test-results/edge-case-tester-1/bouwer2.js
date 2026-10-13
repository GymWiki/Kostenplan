const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const dump = (s) => s.page.evaluate(() => [...document.querySelectorAll("input,select,textarea,button")].filter(e => !/omhoog|omlaag|Zichtbaar|Menu|Bedrijf|donkere|Uitleg/.test(e.getAttribute("aria-label")||"")).slice(-60).map(e => `${e.tagName} ${e.type||""} aria=${e.getAttribute("aria-label")||""} ph=${e.placeholder||""} val=${(e.value||"").slice(0,20)} txt=${(e.innerText||"").slice(0,30)}`).join("\n"));
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/tools/" + s0().a3.tools.tuinaanleg + "/bouwer", maxStappen: 250 });
  function s0() { return require("/home/user/Kostenplan/test-results/seed.json"); }
  await s.page.waitForTimeout(1500);
  console.log("URL", s.page.url());
  await s.page.getByRole("button", { name: /^Schutting/ }).first().click();
  await s.page.waitForTimeout(1200);
  console.log(await dump(s));
  await s.scherm("bouwer-schutting");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
