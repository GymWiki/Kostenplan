const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  const els = await s.page.evaluate(() => Array.from(document.querySelectorAll("button,a,[role=button],[role=switch],[role=checkbox],[role=option],label")).map(e => `${e.tagName}|${(e.textContent||"").trim().slice(0,50)}|${e.getAttribute("aria-label")||""}|${e.getAttribute("title")||""}`).filter(x => /bepal|hoeveel|werkelijk|nacalc|stelpost|actueel/i.test(x)));
  console.log(els);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
