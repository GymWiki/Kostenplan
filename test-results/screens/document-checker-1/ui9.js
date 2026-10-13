const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const FID = "cmv6x0zz3008l7b7dfzjelyuy";
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,label,[role=button],[role=radio],[role=checkbox],[role=menuitem],[role=option],[role=listbox] *,[role=dialog] *,input,select,textarea")].map((e) => (e.innerText || e.getAttribute("aria-label") || e.getAttribute("name") || "").trim().replace(/\s+/g, " ") + (e.type === "checkbox" || e.type === "radio" ? " checked=" + e.checked : "") + ((e.tagName === "INPUT" || e.tagName === "SELECT") ? " value=" + e.value : "")).filter((x) => x && x.length < 140 && !/^(Direct|Kostenplan|Naar|Overzicht|Rekentools|Profiel|Menu|Uitleg|Schakel|Uitloggen|Leads|Alle|Nieuw|Offerte|Akkoord|Afgerond|Open$|Bord|Lijst|Zoek|Te |Openstaand|Gefactureerd|Betaald|Ingepland|Opgeleverd)/.test(x)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 60).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/facturen/${FID}`);
  await s.page.waitForTimeout(800);
  await s.page.getByText("21%", { exact: true }).first().click({ timeout: 5000 }).catch((e) => console.log("klik21 fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(800);
  console.log("=== na klik 21%\n" + await knoppen(s));
  const dlg = await s.page.evaluate(() => (document.querySelector("[role=dialog]") || {innerText: "(geen dialog)"}).innerText.slice(0, 1200));
  console.log("=== dialog\n" + dlg);
  await s.page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/document-checker-1/ui-factuur-btw-klik.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
