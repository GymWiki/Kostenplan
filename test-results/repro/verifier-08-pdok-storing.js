// PDOK-storing: klant verstuurt aanvraag op a3-tool (adres onbekend/storing), hovenier leest locatieregel in leaddrawer.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
const { execSync } = require("child_process");
const sql = (q) => execSync(`psql -h /tmp -p 5433 -U postgres kp -Atc ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();
(async () => {
  const mail = `v08p-${Date.now().toString(36)}@example.nl`;
  fs.writeFileSync("/tmp/pdok-down", "1");
  try {
    const c = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: null });
    await c.ctx.route("https://api.pdok.nl/**", (r) => r.abort());
    await c.ctx.route("https://service.pdok.nl/**", (r) => r.abort());
    await c.goto("/t/devries-a3/tuinaanleg-a3");
    const p = c.page;
    await p.locator("#wg-adres").fill("7311AA 10"); await p.waitForTimeout(1500);
    console.log("klant na adres:", (await p.locator("body").innerText()).replace(/\s+/g, " ").match(/(PDOK|niet bereikbaar|storing|doorgaan)[^.]*\./gi));
    await p.getByLabel("Aantal Graszoden").fill("20"); await p.locator("select").first().selectOption({ index: 1 }).catch(() => {});
    await p.waitForTimeout(800);
    console.log("KLANT:", (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900)); await p.screenshot({ path: "/tmp/claude-0/pdok.png" });
    console.log("BTN:", (await p.getByRole("button").allInnerTexts()).join("|")); await p.screenshot({ path: "/tmp/claude-0/pdok2.png", fullPage: true });
    await p.getByRole("button", { name: /Offerte aanvragen/ }).last().scrollIntoViewIfNeeded(); await p.getByRole("button", { name: /Offerte aanvragen/ }).last().evaluate((e) => e.click());
    await p.getByLabel(/naam/i).first().fill("Verifier PDOK");
    await p.getByLabel(/e-?mail/i).first().fill(mail);
    await p.getByRole("button", { name: /Aanvraag versturen|Versturen|Verstuur/ }).last().click();
    await p.waitForTimeout(3000);
    await c.sluit();
  } finally { fs.rmSync("/tmp/pdok-down", { force: true }); }
  console.log("lead:", sql(`select id from "Lead" where email='${mail}'`));
  const h = await k.open({ agent: "verifier-08", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads" });
  await h.page.getByText("Verifier PDOK").first().click(); await h.page.waitForTimeout(1500);
  const t = (await h.page.locator("body").innerText()).replace(/\s+/g, " ");
  console.log(t.match(/[^.]*(PDOK|Werkgebied niet gecontroleerd)[^.]*\./g));
  await h.scherm("lead-pdok");
  await h.sluit();
})();
