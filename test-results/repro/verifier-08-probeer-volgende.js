// Herhaling: /probeer mobiel, Volgende (stap 1) -> Volgende (stap 2): springt naar /probeer/editor?
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  for (let i = 1; i <= 3; i++) {
    const s = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: "/probeer" });
    const p = s.page;
    await p.getByRole("button", { name: "Volgende" }).click();
    console.log(i, "na 1e Volgende:", await p.getByText(/Stap \d van 3/).first().innerText(), p.url());
    await p.getByRole("button", { name: "Volgende" }).click();
    await p.waitForTimeout(1500);
    console.log(i, "na 2e Volgende:", p.url(), "| stap-tekst:", await p.getByText(/Stap \d van 3/).count());
    if (i === 1) await s.scherm("na-2e-volgende");
    await s.sluit();
  }
  // JS-click (zoals in de melding) als contrast
  const s = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: "/probeer" });
  await s.page.getByRole("button", { name: "Volgende" }).evaluate((e) => e.click());
  await s.page.getByRole("button", { name: "Volgende" }).evaluate((e) => e.click());
  await s.page.waitForTimeout(1000);
  console.log("js-click:", s.page.url());
  await s.sluit();
})();
