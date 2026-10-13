const h = require("./h.js");
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  // Basisstand leads van a3 (ingelogd)
  const b = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 250 });
  await b.page.waitForTimeout(1500);
  console.log("BASIS LEADS:", (await b.page.innerText("body")).replace(/\n+/g, " | ").slice(0, 500));
  await b.scherm("leads-basis");
  await b.sluit();

  const s = await h.open();
  await h.klaar(s, s.seed.a3.tools.tuinaanleg);
  await s.page.getByRole("button", { name: "Offerte aanvragen" }).click();
  await s.page.waitForTimeout(800);
  const lang = "🌳🏡".repeat(60) + " Müller-Ørsted ".repeat(12);
  await s.page.locator("input[name=naam]").fill(lang.slice(0, 500));
  await s.page.locator("input[name=email]").fill("a".repeat(200) + "@voorbeeld.nl");
  await s.page.locator("input[name=telefoonnummer]").fill("+31 (0) 🌳 " + "9".repeat(120));
  await s.scherm("embed-lang-ingevuld");
  await s.page.getByRole("button", { name: "Versturen" }).click();
  await s.page.waitForTimeout(3000);
  console.log("NA VERSTUREN URL", s.page.url());
  console.log("TEKST:", (await h.tekst(s)).slice(-600));
  await s.scherm("embed-lang-na-versturen");
  console.log("CONSOLE", s.consoleFouten.slice(-4), "NET", s.netwerkFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
