const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=menuitem],[role=tab],[role=option],[role=dialog] *")].map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ")).filter((x) => x && x.length < 90 && !/^(Direct|Kostenplan|Naar|Overzicht|Rekentools|Profiel|Menu|Uitleg|Schakel|Uitloggen|Leads)/.test(x)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 70).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/leads`);
  await s.page.getByRole("button", { name: "Lijst" }).click({ timeout: 5000 }).catch(() => s.page.getByText("Lijst", { exact: true }).click({ timeout: 5000 }).catch((e) => console.log("lijst fout", e.message.split("\n")[0])));
  await s.page.waitForTimeout(500);
  await s.page.getByText("Ahmed Akkoord").first().click({ timeout: 5000 }).catch((e) => console.log("rij fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(800);
  console.log("URL", s.page.url());
  console.log("=== na klik\n" + await knoppen(s));
  await s.page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/document-checker-1/ui-ahmed-lead.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
