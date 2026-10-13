const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const sd = k.seed().a1;
  let s = await k.open({ agent:"verifier-01", gebruiker:"a1", viewport:"desktop", pad:"/dashboard/leads/"+sd.leads["offerte-concept"]+"/offerte" });
  const inp = s.page.getByLabel("Onderwerp").first();
  const get = () => s.page.evaluate(()=>{const e=document.activeElement,c=getComputedStyle(e);return {el:e.tagName+" "+(e.getAttribute("aria-label")||e.id),outline:c.outlineStyle+c.outlineWidth,shadow:c.boxShadow,bb:c.borderBottomColor+" "+c.borderBottomWidth}});
  await s.page.mouse.click(5,5);
  console.log("unfocused", await inp.evaluate(e=>{const c=getComputedStyle(e);return c.borderBottomColor+" "+c.borderBottomWidth+" sh="+c.boxShadow}));
  await inp.focus(); await s.page.keyboard.press("Shift+Tab"); await s.page.keyboard.press("Tab");
  console.log("focused input", JSON.stringify(await get()));
  await s.page.screenshot({path:"test-results/screens/verifier-01-input-focus.png",clip:{x:0,y:0,width:1440,height:500}});
  for (const n of ["Bedrijf wisselen","Versturen"]) { await s.page.getByRole("button",{name:n}).first().focus(); await s.page.keyboard.press("Shift+Tab"); await s.page.keyboard.press("Tab"); console.log(n, JSON.stringify(await get())); }
  await s.sluit();
  s = await k.open({ agent:"verifier-01", gebruiker:"a1", viewport:"desktop", pad:"/dashboard/profiel" });
  const trig = s.page.locator('[aria-haspopup="dialog"]').first();
  await s.page.keyboard.press("Tab"); // schone start
  await trig.focus(); await s.page.keyboard.press("Enter"); await s.page.waitForTimeout(500);
  console.log("dlg attrs", await s.page.evaluate(()=>[...document.querySelectorAll('[role=dialog]')].map(d=>d.outerHTML.slice(0,160))), "expanded", await trig.getAttribute("aria-expanded"));
  await s.page.keyboard.press("Escape"); await s.page.waitForTimeout(500);
  console.log("Esc direct", JSON.stringify(await get()), await s.page.locator('[role=dialog]').count());
  await s.sluit();
})();
