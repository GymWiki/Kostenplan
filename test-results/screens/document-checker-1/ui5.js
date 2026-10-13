const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const knoppen = (s) => s.page.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=menuitem],[role=tab],[role=option],select")].map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ") + (e.getAttribute("href") ? " [" + e.getAttribute("href") + "]" : "")).filter((x) => x && !/^(Direct|Kostenplan|Naar|Overzicht|Rekentools|Profiel|Menu|Uitleg|Schakel|Uitloggen)/.test(x)).slice(0, 80).join("\n"));
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/leads`);
  await s.page.waitForTimeout(500);
  const btns = await s.page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /Snelle|Ahmed/.test((b.getAttribute("aria-label") || "") + b.innerText)).map((b) => b.getAttribute("aria-label") || b.innerText).slice(0, 30));
  console.log("BTNS", JSON.stringify(btns));
  await s.page.getByRole("button", { name: /Snelle acties voor Ahmed/ }).first().click({ timeout: 5000 }).catch((e) => console.log("klik fout:", e.message.split("\n")[0]));
  await s.page.waitForTimeout(400);
  console.log("=== menu\n" + await knoppen(s));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
