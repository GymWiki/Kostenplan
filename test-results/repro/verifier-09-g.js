const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const txt = async (p, n=3500) => (await p.innerText("body")).replace(/\n+/g, " | ").slice(0, n);
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/facturen/cmv71embe003jb07d715kgnul" });
  const p = s.page; await p.waitForTimeout(1200);
  // 1. Definitief maken met blokkades
  await p.getByRole("button", { name: /Definitief maken/ }).first().click();
  await p.waitForTimeout(700);
  console.log("DIALOOG:", (await p.locator("[role=dialog]").allInnerTexts()).join("||").replace(/\n+/g," | "));
  const knop = p.locator("[role=dialog]").getByRole("button", { name: /Definitief maken/ });
  console.log("confirm knop count", await knop.count(), "disabled:", await knop.count() ? await knop.first().isDisabled() : null);
  await s.scherm("dialoog-blokkade");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  // 2. klik op de blokkade-tekst
  await p.getByText(/heeft nog geen werkelijke hoeveelheid/).click();
  await p.waitForTimeout(500);
  await s.scherm("na-klik-blokkade");
  // 3. klik op stelpost-regel
  await p.getByText("Te bepalen bij nacalculatie").first().click();
  await p.waitForTimeout(800);
  await s.scherm("regel-geselecteerd");
  const inputs = await p.locator("input, select").evaluateAll(els => els.map(e => ({ type: e.type, name: e.name, id: e.id, label: e.getAttribute("aria-label"), value: e.value })));
  console.log("INPUTS", JSON.stringify(inputs));
  console.log("PANEL:", await p.locator("aside, [class*=panel]").allInnerTexts().then(a=>a.join("||").replace(/\n+/g," | ").slice(0,1500)));
  await s.sluit();
})();
