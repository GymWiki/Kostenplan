const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  const t = await p.locator("body").innerText();
  console.log("concept nog:", /Concept – nog geen nummer/.test(t), "| meldingen:", t.match(/(Ongeldige[^\n]*|Niet[^\n]*|Fout[^\n]*|Kon[^\n]*)/g));
  console.log("definitief-knop disabled:", await p.getByRole("button", { name: "Definitief maken" }).isDisabled());
  await s.scherm("factuur-na-dbl");
  // list
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
