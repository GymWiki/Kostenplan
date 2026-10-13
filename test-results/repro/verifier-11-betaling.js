const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-11", gebruiker: "a1", viewport: "desktop", pad: null });
  const f = s.seed.a1.facturen.verstuurd;
  await s.goto("/dashboard/facturen/" + f);
  const p = s.page;
  const txt = async () => (await p.locator('section[aria-label="Beheer van deze factuur"]').innerText()).replace(/\n+/g, " | ").slice(0, 300);
  console.log("start:", await txt());
  console.log("console:", s.consoleFouten);
  await p.getByRole("button", { name: /Betaling registreren/ }).first().click();
  const inp = p.getByLabel(/Bedrag/i).first();
  console.log("default bedrag:", await inp.inputValue());
  // punt-test
  const def = await inp.inputValue();
  await inp.fill(def.replace(",", "."));
  await p.getByRole("button", { name: /Betaling opslaan/ }).click();
  await p.waitForTimeout(2000);
  console.log("punt:", (await p.getByText(/meer dan het openstaande/).count()) + " foutmeldingen");
  await s.scherm("punt");
  // gedeeltelijke betaling met komma
  await inp.fill("100,00");
  await p.getByRole("button", { name: /Betaling opslaan/ }).click();
  await p.waitForTimeout(3000);
  console.log("dialoog open?", await p.getByRole("button", { name: /Betaling opslaan/ }).count());
  console.log("na opslaan:", await txt());
  await s.scherm("na-opslaan");
  console.log("console:", s.consoleFouten);
  await p.reload({ waitUntil: "networkidle" });
  console.log("na herladen:", await txt());
  await s.sluit();
})().catch((e) => { console.error(e); process.exit(1); });
