const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.getByRole("link", { name: "Vul de uitvoeringsdatum van het werk in." }).click().catch(async () => s.page.getByText("Vul de uitvoeringsdatum van het werk in.").click());
  await s.page.waitForTimeout(700);
  await s.scherm("blokkade-uitvoeringsdatum");
  const d = s.page.getByRole("dialog");
  console.log("DIALOG?", await d.count(), (await d.count()) ? (await d.first().innerText()).slice(0, 600) : "");
  console.log("URL", s.page.url());
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
