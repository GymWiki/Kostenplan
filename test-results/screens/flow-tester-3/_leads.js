const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-3", gebruiker: "a2", viewport: "desktop", pad: "/dashboard", maxStappen: 40 });
  await s.page.getByRole("link", { name: "Leads" }).first().click().catch((e) => console.log("LINK FOUT", e.message.slice(0, 200)));
  await s.page.waitForLoadState("networkidle");
  await s.scherm("leads-overzicht");
  const t = await s.page.locator("main").innerText().catch(() => s.page.locator("body").innerText());
  console.log("LEADS-TEKST", t.slice(0, 2500).replace(/\n+/g, " | "));
  console.log("URL", s.page.url(), "FOUTEN", s.consoleFouten, s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
