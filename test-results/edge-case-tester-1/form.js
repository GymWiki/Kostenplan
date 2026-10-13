const h = require("./h.js");
(async () => {
  const s = await h.open();
  await h.klaar(s, s.seed.a3.tools.tuinaanleg);
  console.log("disabled?", await s.page.getByRole("button", { name: "Offerte aanvragen" }).isDisabled());
  await s.page.getByRole("button", { name: "Offerte aanvragen" }).click();
  await s.page.waitForTimeout(1200);
  console.log("URL", s.page.url());
  const kn = await s.page.evaluate(() => [...document.querySelectorAll("input,select,textarea,button")].map(e => `${e.tagName} ${e.type||""} name=${e.name||""} aria=${e.getAttribute("aria-label")||""} ph=${e.placeholder||""} txt=${(e.innerText||"").slice(0,30)}`));
  console.log(kn.join("\n"));
  console.log((await h.tekst(s)).slice(-900));
  await s.scherm("formulier");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0,300)); process.exit(1); });
