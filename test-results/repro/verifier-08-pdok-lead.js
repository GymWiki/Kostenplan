// Vervolg op verifier-08-pdok-storing.js: leaddetail van de aanvraag 'Verifier PDOK' (a3).
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { execSync } = require("child_process");
(async () => {
  const id = execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc "select id from \\"Lead\\" where naam='Verifier PDOK' order by \\"createdAt\\" desc limit 1"`, { encoding: "utf8" }).trim();
  console.log("lead", id);
  const h = await k.open({ agent: "verifier-08", gebruiker: "a3", viewport: "desktop", pad: `/dashboard/leads?lead=${id}` });
  await h.page.waitForTimeout(2000);
  let t = (await h.page.locator("body").innerText()).replace(/\s+/g, " ");
  if (!/PDOK was/.test(t)) { await h.page.getByText("Verifier PDOK").first().click().catch(() => {}); await h.page.waitForTimeout(1500); t = (await h.page.locator("body").innerText()).replace(/\s+/g, " "); }
  console.log(t.match(/[^.]*(PDOK|Werkgebied niet gecontroleerd)[^.]*\./g), h.page.url());
  await h.scherm("lead-pdok");
  await h.sluit();
})();
