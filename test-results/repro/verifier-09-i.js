const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { execSync } = require("child_process");
const label = (id) => execSync(`psql postgresql://postgres@127.0.0.1:5433/kp -At -c "select jsonb_path_query(inhoud,'\\$.secties[*].regels[*] ? (@.omschrijving==\\"Grondwerk en afvoer\\")') from \\"Factuur\\" where id='${id}'"`).toString().trim();
(async () => {
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/leads?lead=cmv71berl00bdu07dree64o16" });
  const p = s.page; await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /Factuur maken/ }).first().click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Eén factuur voor het totaal" }).click();
  await p.waitForURL(/facturen\//, { timeout: 20000 }); await p.waitForTimeout(1500);
  const id = p.url().split("/").pop(); console.log("FACTUUR", id);
  const lijst = async () => (await p.getByText(/heeft nog geen werkelijke hoeveelheid/).allInnerTexts());
  console.log("start blokkade:", await lijst());
  await p.getByText("Te bepalen bij nacalculatie").first().click(); await p.waitForTimeout(600);
  console.log("PANEL has link/field for 'werkelijke hoeveelheid'? labels:", await p.locator("label").allInnerTexts().then(a=>a.join(" | ")));
  // zelfde waarde 1 typen
  await p.locator("#rg-aantal").fill("1"); await p.locator("#rg-aantal").blur(); await p.waitForTimeout(1500);
  console.log("DB na aantal=1 (zelfde):", label(id));
  // soort normaal kiezen
  await p.locator("#rg-type").selectOption("stelpost"); await p.waitForTimeout(1200);
  await p.locator("#rg-type").selectOption("normaal"); await p.waitForTimeout(1500);
  console.log("DB na soort stelpost->normaal:", label(id));
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  console.log("na reload blokkade:", await lijst());
  await s.scherm("zelfde-waarde");
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})();
