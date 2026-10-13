const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads" });
  const p = s.page;
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: /Verifier Tien/ }).first().click(); await p.waitForTimeout(1500);
  let t = await p.innerText("body"); let i = t.indexOf("Wat de klant koos");
  console.log("LEAD:", t.slice(i, i+700).replace(/\n+/g," | "));
  console.log(await p.evaluate(() => [...document.querySelectorAll("a,button")].map(e => (e.innerText||"").trim().slice(0,40)+"->"+(e.getAttribute("href")||"")).filter(x=>/ofert|whats|bellen/i.test(x)).join("\n")));
  await s.sluit();
})();
