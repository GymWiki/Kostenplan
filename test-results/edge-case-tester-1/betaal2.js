const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/facturen/" + seed.a3.facturen.verstuurd, maxStappen: 250 });
  const aantal = async () => (await s.page.innerText("body")).split("Betaling ontvangen").length - 1;
  console.log("VOOR betalingen-regels:", await aantal(), "openstaand:", (await s.page.innerText("body")).match(/Openstaand[^\n]*\n?[^\n]*/)?.[0]);
  await s.page.getByRole("button", { name: "Betaling registreren" }).first().click();
  await s.page.waitForTimeout(700);
  const veld = s.page.getByLabel(/Bedrag/).first();
  await veld.fill("12,5");
  await s.page.getByRole("button", { name: "Betaling opslaan" }).dblclick();
  await s.page.waitForTimeout(3000);
  await s.scherm("betaal-dubbel");
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(800);
  console.log("NA dubbelklik (na reload) betalingen-regels:", await aantal());
  const t = await s.page.innerText("body");
  console.log(t.replace(/\n+/g, " | ").match(/Betalingen[^]{0,300}/)?.[0] || "(geen Betalingen-blok)");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
