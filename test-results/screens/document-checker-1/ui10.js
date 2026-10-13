const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const FID = "cmv6x0zz3008l7b7dfzjelyuy";
const inv = (s) => s.page.evaluate(() => [...document.querySelectorAll("input,select,textarea,label,[role=checkbox],[role=switch]")].filter((e) => e.offsetParent !== null).map((e) => (e.getAttribute("aria-label") || e.getAttribute("name") || e.placeholder || e.innerText || "").trim().slice(0, 80) + (e.type === "checkbox" || e.getAttribute("role") === "switch" ? " checked=" + (e.checked ?? e.getAttribute("aria-checked")) : "") + " value=" + (e.value || "")).filter((x) => x.trim()).slice(0, 60).join("\n"));
const body = (s) => s.page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n").match(/.*(verlegd|Btw|btw-id|BTW-id).*/gi)?.slice(0, 20).join("\n") || "(geen btw-verlegd tekst)");
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await s.goto(`/dashboard/facturen/${FID}`);
  await s.page.waitForTimeout(800);
  await s.page.keyboard.press("Escape");
  await s.page.getByText("Jansen Bouw BV", { exact: true }).first().click({ timeout: 5000 }).catch((e) => console.log("klant fout", e.message.split("\n")[0]));
  await s.page.waitForTimeout(800);
  console.log("=== na klik klant (inputs)\n" + await inv(s));
  console.log("=== btw-teksten op pagina\n" + await body(s));
  await s.page.screenshot({ path: "/home/user/Kostenplan/test-results/screens/document-checker-1/ui-factuur-klant-klik.png" });
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.split("\n")[0]); process.exit(1); });
