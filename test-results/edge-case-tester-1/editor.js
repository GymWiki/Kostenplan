const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/tools/" + require("/home/user/Kostenplan/test-results/seed.json").a3.tools.tuinaanleg + "/bouwer", maxStappen: 250 });
  await s.page.waitForTimeout(2000);
  console.log("URL", s.page.url());
  const kn = await s.page.evaluate(() => [...document.querySelectorAll("input,select,textarea,button")].map(e => `${e.tagName} ${e.type||""} aria=${e.getAttribute("aria-label")||""} ph=${e.placeholder||""} val=${(e.value||"").slice(0,20)} txt=${(e.innerText||"").slice(0,30)}`));
  console.log(kn.join("\n"));
  await s.scherm("editor");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
