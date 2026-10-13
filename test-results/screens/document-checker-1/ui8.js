const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,label,[role=button],[role=radio],[role=checkbox],[role=menuitem],input,select,textarea")].map((e) => (e.innerText || e.getAttribute("aria-label") || e.getAttribute("name") || e.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ") + (e.type === "checkbox" || e.type === "radio" ? " checked=" + e.checked : "") + ((e.tagName === "INPUT" || e.tagName === "SELECT" || e.tagName === "TEXTAREA") ? " value=" + e.value : "")).filter((x) => x && x.length < 140 && !/^(Direct|Kostenplan|Naar|Overzicht|Rekentools|Profiel|Menu|Uitleg|Schakel|Uitloggen|Leads|Alle|Nieuw|Offerte|Akkoord|Afgerond|Open$|Bord|Lijst|Zoek|Te |Openstaand|Gefactureerd|Betaald|Ingepland|Opgeleverd)/.test(x)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 90).join("\n"));
const tekst = (s) => s.page.evaluate(() => (document.querySelector("[role=dialog]") || document.body).innerText.replace(/\n{2,}/g, "\n").slice(0, 3000));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/leads?weergave=lijst`);
  await s.page.getByText("Ahmed Akkoord").first().click({ timeout: 5000 });
  await s.page.waitForTimeout(800);
  await s.page.getByRole("button", { name: "Factuur maken" }).first().click({ timeout: 5000 });
  await s.page.waitForTimeout(500);
  await s.page.getByText("Eén factuur voor het totaal", { exact: true }).click({ timeout: 5000 }).catch((e) => console.log("keuze fout", e.message.split("\n")[0]));
  await s.page.waitForLoadState("networkidle").catch(() => {});
  await s.page.waitForTimeout(1000);
  console.log("URL", s.page.url());
  console.log("=== tekst\n" + await tekst(s));
  console.log("=== invoer\n" + await knoppen(s));
  await s.page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/document-checker-1/ui-factuur-een-totaal.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
