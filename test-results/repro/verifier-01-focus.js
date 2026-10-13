const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const info = () => document.activeElement && (function(e){const c=getComputedStyle(e);return {tag:e.tagName,label:(e.getAttribute("aria-label")||e.name||e.id||e.textContent||"").trim().slice(0,30),outline:c.outlineStyle+" "+c.outlineWidth+" "+c.outlineColor,shadow:c.boxShadow.slice(0,70),fv:e.matches(":focus-visible"),border:c.borderColor}})(document.activeElement);
(async () => {
  const sd = k.seed().a1;
  for (const p of ["/dashboard/leads/"+sd.leads["offerte-concept"]+"/offerte","/dashboard/facturen/"+sd.facturen.concept]) {
    const s = await k.open({ agent:"verifier-01", gebruiker:"a1", viewport:"desktop", pad:p });
    console.log("== "+p);
    for (let i=1;i<=16;i++){ await s.page.keyboard.press("Tab"); console.log(i, JSON.stringify(await s.page.evaluate(info))); }
    await s.sluit();
  }
  // dialoog
  const s = await k.open({ agent:"verifier-01", gebruiker:"a1", viewport:"desktop", pad:"/dashboard/profiel" });
  const trig = s.page.locator('[aria-haspopup="dialog"]').first();
  console.log("trigger", await trig.evaluate(e=>e.outerHTML.slice(0,200)), await s.page.locator('[aria-haspopup="dialog"]').count());
  await trig.focus(); await s.page.keyboard.press("Enter"); await s.page.waitForTimeout(600);
  console.log("na Enter", JSON.stringify(await s.page.evaluate(info)), await s.page.locator('[role=dialog]').count());
  for (let i=1;i<=8;i++){ await s.page.keyboard.press("Tab"); console.log(i, JSON.stringify(await s.page.evaluate(()=>{const e=document.activeElement;return {tag:e.tagName,l:(e.getAttribute("aria-label")||e.textContent||"").trim().slice(0,30),inDlg:!!e.closest('[role=dialog]')}}))); }
  await s.page.keyboard.press("Escape"); await s.page.waitForTimeout(600);
  console.log("na Esc", JSON.stringify(await s.page.evaluate(info)), "dialogen", await s.page.locator('[role=dialog]').count());
  await s.sluit();
})();
