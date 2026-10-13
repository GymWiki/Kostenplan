const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-06", gebruiker: "a1", viewport: "desktop", pad: null });
  const tool = s.seed.a1.tools.tuinaanleg;
  const prod = s.seed.a1.products;
  const url = `/dashboard/tools/${tool}?paneel=werkzaamheid%3A${prod[0]}`;
  for (const w of ["-10", "1000000000", "12,50"]) {
    await s.goto(url);
    await s.page.waitForTimeout(800);
    const inputs = s.page.locator('[role=dialog] input, aside input, form input');
    const n = await inputs.count();
    if (w === "-10") { const vals=[]; for (let i=0;i<n;i++) vals.push(await inputs.nth(i).getAttribute("aria-label")+"="+await inputs.nth(i).inputValue()); console.log(vals.join(" | ")); }
    const pr = s.page.getByLabel(/prijs/i).first();
    console.log("prijsveld voor", await pr.inputValue().catch(e=>"geen"));
    await pr.fill(w); await pr.press("Tab");
    await s.page.waitForTimeout(2500);
    console.log(w, "melding:", (await s.page.locator('[role=alert], .text-destructive').allInnerTexts()).join(" / "), "| veld nu:", await pr.inputValue());
    await s.scherm("prijs-" + w);
    await s.goto(url); await s.page.waitForTimeout(800);
    console.log(w, "na herladen:", await s.page.getByLabel(/prijs/i).first().inputValue());
  }
  await s.sluit();
})().catch(e=>{console.error(e);process.exit(1)});
