const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/tools/cmv71beox009du07di5knapuu" });
  const p = s.page; await p.waitForTimeout(1200);
  const bar = await p.evaluate(() => { const b = document.querySelector("[data-actiebalk]"); if (!b) return null; const r = b.getBoundingClientRect(); return { top: r.top, h: r.height, pos: getComputedStyle(b).position }; });
  console.log("actiebalk", bar);
  const tg = p.getByLabel("Zichtbaar voor klanten: Kunstgras");
  console.log("switch count", await tg.count());
  // Playwright scrollIntoViewIfNeeded: waar komt de schakelaar uit?
  await tg.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const r = await tg.boundingBox(); console.log("Kunstgras switch box na scrollIntoViewIfNeeded", r, "viewport h 915");
  console.log("scrollY/maxScroll", await p.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]));
  const hit = await p.evaluate(({x,y}) => { const e = document.elementFromPoint(x,y); return e && (e.closest("[data-actiebalk]") ? "ACTIEBALK" : e.tagName+":"+(e.getAttribute("aria-label")||e.className).toString().slice(0,50)); }, { x: r.x + r.width/2, y: r.y + r.height/2 });
  console.log("element op tikpunt:", hit);
  try { await tg.click({ timeout: 3000 }); console.log("click ok (let op: wijzigt a3 Kunstgras!)"); } catch (e) { console.log("click fout:", e.message.split("\n").slice(0,6).join(" / ")); }
  // alle schakelaars: nabij de balk bij maximale scroll?
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
  const b2 = await p.evaluate(() => { const b = document.querySelector("[data-actiebalk]"); return b && b.getBoundingClientRect().top; });
  for (const sw of await p.locator("[aria-label^=\"Zichtbaar voor klanten\"]").all()) { const bb = await sw.boundingBox(); console.log(await sw.getAttribute("aria-label"), "onderrand", Math.round(bb.y+bb.height), "balk top", b2); }
  await p.screenshot({ path: "test-results/screens/verifier-10/e4.png" });
  await s.sluit();
})();
