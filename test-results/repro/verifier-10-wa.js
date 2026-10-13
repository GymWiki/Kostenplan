// Herhaling: WhatsApp-deellink in versturen-stap. Vereist een lead met telefoon (aangemaakt via de klantpagina, zie verifier-10-klant2.js met Telefoon ingevuld).
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a1", viewport: "mobiel", pad: process.argv[2] || "/dashboard/leads/cmv71n4nm004vb07dr0wjrgeg/offerte" });
  const p = s.page; await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /^Versturen/ }).first().click(); await p.waitForTimeout(1500);
  await p.getByRole("button", { name: "Verder naar versturen" }).click(); await p.waitForTimeout(3000);
  console.log(await p.evaluate(() => [...document.querySelectorAll("a")].map(e => (e.innerText||"").trim().slice(0,40)+"->"+(e.getAttribute("href")||"").slice(0,90)).filter(x=>/whats|mail/i.test(x)).join("\n")));
  await s.sluit();
})();
