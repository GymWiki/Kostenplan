const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  const links = await s.page.locator("a, button").evaluateAll(els => els.filter(e => /uitvoering|stelpost|Grondwerk/i.test(e.textContent)).map(e => e.tagName + ":" + e.textContent.trim().slice(0,80) + ":" + (e.getAttribute("href")||"")));
  console.log("KANDIDATEN", links);
  await s.page.getByText("nog invullen").click();
  await s.page.waitForTimeout(700);
  await s.scherm("uitvoeringsdatum-klik");
  const body = await s.page.locator("body").innerText();
  console.log(body.slice(body.indexOf("Factuur\n\nKlik") , body.indexOf("Factuur\n\nKlik")+400));
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
