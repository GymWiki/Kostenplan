const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-11", gebruiker: "a1", viewport: "desktop", pad: null });
  const p = s.page;
  await s.goto("/dashboard/facturen/" + s.seed.a1.facturen.concept);
  const bp = () => p.locator('section[aria-label="Beheer van deze factuur"]').innerText().then(t=>t.replace(/\n+/g," | ").slice(0,260));
  console.log("start:", await bp());
  await p.getByRole("button", { name: /Betaling van .* verwijderen/ }).first().click();
  await p.waitForTimeout(800);
  const d = p.getByRole("alertdialog").or(p.getByRole("dialog"));
  console.log("dialoog:", (await d.innerText()).replace(/\n+/g," | "));
  await d.getByRole("button", { name: "Verwijderen", exact: true }).click();
  await p.waitForTimeout(4000);
  console.log("na verwijderen:", await bp());
  console.log("console:", s.consoleFouten);
  await p.reload({waitUntil:"networkidle"});
  console.log("na herladen:", await bp());
  await s.sluit();
})().catch((e) => { console.error(e); process.exit(1); });
